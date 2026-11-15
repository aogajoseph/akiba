"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./group-chat.module.css";

const PAGE_SIZE = 30;

type MessageRow = {
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type ChatMessage = MessageRow & {
  authorName: string;
  isMine: boolean;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  username: string;
};

type MessageCursor = Pick<MessageRow, "created_at" | "id">;

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) => {
    const timeOrder = a.created_at.localeCompare(b.created_at);
    return timeOrder || a.id.localeCompare(b.id);
  });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function GroupChat({ groupId }: { groupId: string }) {
  const [groupName, setGroupName] = useState("Group conversation");
  const [currentUserId, setCurrentUserId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [connection, setConnection] = useState<"connecting" | "connected" | "reconnecting">("connecting");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const currentUserIdRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const hydrateMessages = useCallback(async (rows: MessageRow[], userId: string) => {
    const client = clientRef.current;
    if (!client || rows.length === 0) return [];

    const authorIds = Array.from(new Set(rows.map((row) => row.author_id)));
    const { data: profiles } = await client
      .from("akiba_profiles")
      .select("user_id,display_name,username")
      .in("user_id", authorIds);

    const profileById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile]),
    );

    return rows.map((row) => {
      const profile = profileById.get(row.author_id);
      return {
        ...row,
        authorName: profile?.display_name?.trim() || profile?.username || "Akiba member",
        isMine: row.author_id === userId,
      } satisfies ChatMessage;
    });
  }, []);

  const loadLatest = useCallback(async (replace = false) => {
    const client = clientRef.current;
    const userId = currentUserIdRef.current;
    if (!client || !userId) return;

    const { data, error } = await client
      .from("akiba_group_messages")
      .select("id,group_id,author_id,body,created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      setErrorMessage("We couldn't load this group's messages. Please try again.");
      return;
    }

    const rows = (data ?? []) as MessageRow[];
    const hydrated = await hydrateMessages(rows, userId);
    setMessages((current) => mergeMessages(replace ? [] : current, hydrated));
    setHasMore(rows.length === PAGE_SIZE);
    setStatus("ready");
  }, [groupId, hydrateMessages]);

  const loadMessage = useCallback(async (messageId: string) => {
    const client = clientRef.current;
    const userId = currentUserIdRef.current;
    if (!client || !userId) return;

    const { data, error } = await client
      .from("akiba_group_messages")
      .select("id,group_id,author_id,body,created_at")
      .eq("group_id", groupId)
      .eq("id", messageId)
      .maybeSingle();

    if (error || !data) return;
    const hydrated = await hydrateMessages([data as MessageRow], userId);
    setMessages((current) => mergeMessages(current, hydrated));
  }, [groupId, hydrateMessages]);

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;

    async function initialize() {
      try {
        const client = createClient();
        clientRef.current = client;

        const { data: authData, error: authError } = await client.auth.getUser();
        if (!active) return;
        if (authError || !authData.user) {
          setStatus("denied");
          setErrorMessage("Sign in to view this group's conversation.");
          return;
        }

        const userId = authData.user.id;
        currentUserIdRef.current = userId;
        const { data: group, error: groupError } = await client
          .from("akiba_groups")
          .select("id,name,status")
          .eq("id", groupId)
          .eq("status", "active")
          .maybeSingle();

        if (!active) return;
        if (groupError || !group) {
          setStatus("denied");
          setErrorMessage("This group is unavailable, inactive, or you don't have access to it.");
          return;
        }

        const { data: membership, error: membershipError } = await client
          .from("akiba_group_memberships")
          .select("role,status")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();

        if (!active) return;
        if (membershipError || !membership) {
          setStatus("denied");
          setErrorMessage("Only current group members can view this conversation.");
          return;
        }

        setGroupName(group.name);
        setCurrentUserId(userId);
        clientRef.current = client;

        const { data: initialRows, error: initialError } = await client
          .from("akiba_group_messages")
          .select("id,group_id,author_id,body,created_at")
          .eq("group_id", groupId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(PAGE_SIZE);

        if (!active) return;
        if (initialError) {
          setStatus("error");
          setErrorMessage("We couldn't load this group's messages. Please try again.");
          return;
        }

        const rows = (initialRows ?? []) as MessageRow[];
        const hydrated = await hydrateMessages(rows, userId);
        if (!active) return;
        setMessages(mergeMessages([], hydrated));
        setHasMore(rows.length === PAGE_SIZE);
        setStatus("ready");

        channel = client
          .channel("group:" + groupId + ":chat", { config: { private: true } })
          .on("broadcast", { event: "message_created" }, ({ payload }) => {
            const event = payload as { group_id?: string; message_id?: string };
            if (event.group_id === groupId && event.message_id) {
              void loadMessage(event.message_id);
            }
          })
          .subscribe((channelStatus) => {
            if (!active) return;
            if (channelStatus === "SUBSCRIBED") {
              setConnection("connected");
              // Recover messages missed during a temporary disconnect.
              void loadLatest(false);
            } else if (
              channelStatus === "CHANNEL_ERROR" ||
              channelStatus === "TIMED_OUT" ||
              channelStatus === "CLOSED"
            ) {
              setConnection("reconnecting");
            }
          });
      } catch {
        if (!active) return;
        setStatus("error");
        setErrorMessage("Akiba chat couldn't connect. Check your connection and try again.");
      }
    }

    void initialize();

    return () => {
      active = false;
      if (channel && clientRef.current) {
        void clientRef.current.removeChannel(channel);
      }
      clientRef.current = null;
    };
  }, [groupId, hydrateMessages, loadLatest, loadMessage]);

  async function loadOlderMessages() {
    const client = clientRef.current;
    const oldest = messages[0];
    if (!client || !oldest || loadingOlder || !hasMore) return;

    setLoadingOlder(true);
    const cursor = oldest as MessageCursor;
    const { data, error } = await client
      .from("akiba_group_messages")
      .select("id,group_id,author_id,body,created_at")
      .eq("group_id", groupId)
      .or(
        "created_at.lt." + cursor.created_at +
          ",and(created_at.eq." + cursor.created_at + ",id.lt." + cursor.id + ")",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      setSendError("Older messages couldn't be loaded. Please try again.");
      setLoadingOlder(false);
      return;
    }

    const rows = (data ?? []) as MessageRow[];
    const hydrated = await hydrateMessages(rows, currentUserId);
    setMessages((current) => mergeMessages(current, hydrated));
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingOlder(false);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    const client = clientRef.current;

    if (!body || !client || !currentUserId || sending || body.length > 1000) return;

    setSending(true);
    setSendError("");

    const { data, error } = await client
      .from("akiba_group_messages")
      .insert({
        group_id: groupId,
        author_id: currentUserId,
        body,
      })
      .select("id,group_id,author_id,body,created_at")
      .single();

    if (error || !data) {
      setSendError(
        error?.code === "42501"
          ? "You no longer have permission to post in this group."
          : "Your message wasn't sent. Check your connection and try again.",
      );
      setSending(false);
      return;
    }

    const hydrated = await hydrateMessages([data as MessageRow], currentUserId);
    setMessages((current) => mergeMessages(current, hydrated));
    setDraft("");
    setSending(false);
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  if (status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} />
          <p>Opening your group conversation…</p>
        </div>
      </main>
    );
  }

  if (status === "denied" || status === "error") {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}><span className={styles.brandMark}>a</span> akiba</Link>
          <Link href="/" className={styles.backLink}>← Back to Akiba</Link>
        </header>
        <section className={styles.accessCard} role="alert">
          <span className={styles.accessIcon}>!</span>
          <h1>Conversation unavailable</h1>
          <p>{errorMessage}</p>
          <Link href="/" className={styles.backButton}>Return to Akiba</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}><span className={styles.brandMark}>a</span> akiba</Link>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>/</span><span>{groupName}</span><span>/</span><b>Group chat</b>
        </nav>
        <Link href="/" className={styles.backLink}>All groups</Link>
      </header>

      <section className={styles.heading}>
        <div className={styles.headingIcon}>↗</div>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>GROUP CONVERSATION</p>
          <h1>{groupName}</h1>
          <p>Plans, questions and updates shared with members of this group.</p>
        </div>
        <div className={styles.connection}>
          <span className={connection === "connected" ? styles.onlineDot : styles.offlineDot} />
          {connection === "connected" ? "Live" : connection === "connecting" ? "Connecting" : "Reconnecting"}
        </div>
      </section>

      <section className={styles.chatCard} aria-label="Group conversation">
        <div className={styles.chatHeader}>
          <div>
            <h2>Conversation</h2>
            <p>Only active members of this group can read or send messages.</p>
          </div>
          <span className={styles.secureLabel}><span>●</span> Group-only</span>
        </div>

        <div className={styles.messages}>
          {hasMore && (
            <button
              type="button"
              className={styles.olderButton}
              onClick={() => void loadOlderMessages()}
              disabled={loadingOlder}
            >
              {loadingOlder ? "Loading older messages…" : "Load earlier messages"}
            </button>
          )}

          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✉</div>
              <h3>Start the conversation</h3>
              <p>Share an update or ask the group a question. Your message will stay here for members to see.</p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={message.isMine ? styles.messageMine : styles.message}
              >
                <div className={styles.messageAvatar}>
                  {message.authorName.slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.messageBody}>
                  <div className={styles.messageMeta}>
                    <b>{message.isMine ? "You" : message.authorName}</b>
                    <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                  </div>
                  <p>{message.body}</p>
                </div>
              </article>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {errorMessage && <p className={styles.inlineError} role="alert">{errorMessage}</p>}
        {sendError && <p className={styles.inlineError} role="alert">{sendError}</p>}

        <form className={styles.composer} onSubmit={sendMessage}>
          <label className={styles.srOnly} htmlFor="group-chat-message">Write a group message</label>
          <textarea
            id="group-chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Write a message…"
            maxLength={1000}
            rows={2}
            disabled={sending || status !== "ready"}
          />
          <div className={styles.composerFooter}>
            <span>{draft.length}/1000 · Enter to send, Shift+Enter for a new line</span>
            <button type="submit" disabled={!draft.trim() || sending || status !== "ready"}>
              {sending ? "Sending…" : "Send message"} <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <p className={styles.footerNote}>Messages are for group coordination. Contributions and withdrawals are recorded separately.</p>
      </section>
    </main>
  );
}
