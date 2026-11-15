"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import styles from "./group-chat.module.css";

const PAGE_SIZE = 30;

type MessageRow = {
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
};

type ChatMessage = MessageRow & {
  authorName: string;
  avatarUrl: string | null;
  isMine: boolean;
  replyPreview: string | null;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  username: string;
  avatar_path: string | null;
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
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [mutatingMessageId, setMutatingMessageId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
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
      .select("user_id,display_name,username,avatar_path")
      .in("user_id", authorIds);

    const profileById = new Map<string, ProfileRow>();
    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileById.set(profile.user_id, profile);
    }

    const parentIds = Array.from(new Set(rows.map((row) => row.parent_message_id).filter((id): id is string => Boolean(id))));
    const parentBodies = new Map<string, string>();
    if (parentIds.length) {
      const { data: parents } = await client.from("akiba_group_messages")
        .select("id,body,deleted_at").in("id", parentIds);
      for (const parent of parents ?? []) {
        parentBodies.set(parent.id, parent.deleted_at ? "This message was deleted" : parent.body);
      }
    }

    return rows.map((row) => {
      const profile = profileById.get(row.author_id);
      return {
        ...row,
        authorName: profile?.display_name?.trim() || profile?.username || "Akiba member",
        avatarUrl: profile?.avatar_path
          ? client.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
          : null,
        isMine: row.author_id === userId,
        replyPreview: row.parent_message_id ? parentBodies.get(row.parent_message_id) ?? "Original message unavailable" : null,
      } satisfies ChatMessage;
    });
  }, []);

  const loadLatest = useCallback(async (replace = false) => {
    const client = clientRef.current;
    const userId = currentUserIdRef.current;
    if (!client || !userId) return;

    const { data, error } = await client
      .from("akiba_group_messages")
      .select("id,group_id,author_id,body,created_at,parent_message_id,edited_at,deleted_at")
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
      .select("id,group_id,author_id,body,created_at,parent_message_id,edited_at,deleted_at")
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
          .select("id,group_id,author_id,body,created_at,parent_message_id,edited_at,deleted_at")
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
          .on("broadcast", { event: "message_updated" }, ({ payload }) => {
            const event = payload as { group_id?: string; message_id?: string };
            if (event.group_id === groupId && event.message_id) void loadMessage(event.message_id);
          })
          .on("broadcast", { event: "message_deleted" }, ({ payload }) => {
            const event = payload as { group_id?: string; message_id?: string };
            if (event.group_id === groupId && event.message_id) void loadMessage(event.message_id);
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
      .select("id,group_id,author_id,body,created_at,parent_message_id,edited_at,deleted_at")
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

    if (!client || !currentUserId || sending) return;
    if (!body || body.length > 1000) return;

    setSending(true);
    setSendError("");

    const query = editingMessage
      ? client.from("akiba_group_messages").update({ body }).eq("id", editingMessage.id).eq("group_id", groupId)
      : client.from("akiba_group_messages").insert({
          group_id: groupId,
          author_id: currentUserId,
          body,
          parent_message_id: replyTarget?.id ?? null,
        });
    const { data, error } = await query
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
    setReplyTarget(null);
    setEditingMessage(null);
    setSending(false);
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function confirmDeleteMessage() {
    const target = deleteTarget;
    const client = clientRef.current;
    if (!target || !client || mutatingMessageId) return;

    setMutatingMessageId(target.id);
    setSendError("");
    try {
      const { data, error } = await client
        .from("akiba_group_messages")
        .update({ body: "[deleted]", deleted_at: new Date().toISOString() })
        .eq("id", target.id)
        .eq("group_id", groupId)
        .select("id,deleted_at")
        .maybeSingle();

      if (error) {
        console.error("Group chat message deletion failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setSendError(
          error.code === "42501"
            ? "You no longer have permission to delete this message."
            : "The message could not be deleted. Please try again.",
        );
        return;
      }

      if (!data) {
        setSendError("This message is no longer available to delete. Refresh the conversation and try again.");
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === target.id
            ? { ...item, body: "[deleted]", deleted_at: data.deleted_at ?? new Date().toISOString() }
            : item,
        ),
      );
      setDeleteTarget(null);
    } catch (error) {
      console.error("Unexpected group chat message deletion error", error);
      setSendError("The message could not be deleted. Please try again.");
    } finally {
      setMutatingMessageId(null);
    }
  }

  useEffect(() => {
    if (!deleteTarget) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !mutatingMessageId) setDeleteTarget(null);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [deleteTarget, mutatingMessageId]);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  if (status === "loading") {
    return <section className={styles.chatCard} aria-live="polite"><div className={styles.loadingCard}><span className={styles.spinner} /><p>Opening your group conversation…</p></div></section>;
  }

  if (status === "denied" || status === "error") {
    return (
      <section className={styles.chatCard}>
        <div className={styles.accessCard} role="alert">
          <span className={styles.accessIcon}>!</span>
          <h2>Conversation unavailable</h2>
          <p>{errorMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.chatCard} aria-label="Group conversation">
      <div className={styles.chatHeader}>
        <div>
          <h2>Group chat</h2>
          <p>Only active members of this group can read or send messages.</p>
        </div>
        <div className={styles.chatHeaderActions}>
          <span className={styles.connection}>
            <span className={connection === "connected" ? styles.onlineDot : styles.offlineDot} />
            {connection === "connected" ? "Live" : connection === "connecting" ? "Connecting" : "Reconnecting"}
          </span>
          <span className={styles.secureLabel}><span>●</span> Group-only</span>
        </div>
      </div>
      <div className={styles.messages}>
        {hasMore && <button type="button" className={styles.olderButton} onClick={() => void loadOlderMessages()} disabled={loadingOlder}>{loadingOlder ? "Loading older messages…" : "Load earlier messages"}</button>}
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✉</div>
            <h3>Start the conversation</h3>
            <p>Share an update or ask the group a question. Your message will stay here for members to see.</p>
          </div>
        ) : messages.map((message) => (
          <article id={"message-" + message.id} key={message.id} className={message.isMine ? styles.messageMine : styles.message}>
            <div className={styles.messageAvatar} aria-hidden="true">{message.avatarUrl ? <img src={message.avatarUrl} alt="" /> : message.authorName.slice(0, 1).toUpperCase()}</div>
            <div className={styles.messageBody}>
              <div className={styles.messageMeta}><b>{message.isMine ? "You" : message.authorName}</b><time dateTime={message.created_at}>{formatTime(message.created_at)}</time></div>
              {message.replyPreview && <button type="button" className={styles.replyPreview} onClick={() => document.getElementById("message-" + message.parent_message_id)?.scrollIntoView({ behavior: "smooth", block: "center" })}>↪ {message.replyPreview.slice(0, 120)}</button>}
              <p>{message.deleted_at ? "This message was deleted" : message.body}</p>
              {message.edited_at && !message.deleted_at && <small className={styles.editedLabel}>Edited</small>}
              <div className={styles.messageActions}>
                <button type="button" onClick={() => { setEditingMessage(null); setReplyTarget(message); }}>Reply</button>
                {!message.deleted_at && message.isMine && <>
                  <button type="button" onClick={() => { setReplyTarget(null); setEditingMessage(message); setDraft(message.body); }}>Edit</button>
                  <button type="button" disabled={mutatingMessageId === message.id} onClick={() => { setSendError(""); setDeleteTarget(message); }}>Delete</button>
                </>}
              </div>
            </div>
          </article>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {errorMessage && <p className={styles.inlineError} role="alert">{errorMessage}</p>}
      {sendError && <p className={styles.inlineError} role="alert">{sendError}</p>}
      {(replyTarget || editingMessage) && <div className={styles.composerContext}>
        <span>{editingMessage ? "Editing your message" : "Replying to " + (replyTarget?.isMine ? "your message" : replyTarget?.authorName)}</span>
        <p>{editingMessage?.body ?? replyTarget?.body}</p>
        <button type="button" onClick={() => { setReplyTarget(null); setEditingMessage(null); setDraft(""); }}>Cancel</button>
      </div>}
      <form className={styles.composer} onSubmit={sendMessage}>
        <label className={styles.srOnly} htmlFor="group-chat-message">Write a group message</label>
        <textarea id="group-chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Write a message…" maxLength={1000} rows={2} disabled={sending || status !== "ready"} />
        <div className={styles.composerFooter}>
          <span>{draft.length}/1000 · Enter to send, Shift+Enter for a new line</span>
          <button type="submit" disabled={!draft.trim() || sending || status !== "ready"}>{sending ? (editingMessage ? "Saving…" : "Sending…") : (editingMessage ? "Save edit" : "Send message")} <span aria-hidden="true">→</span></button>
        </div>
      </form>
      <p className={styles.footerNote}>Messages are for group coordination. Contributions and withdrawals are recorded separately.</p>
      {deleteTarget && (
        <div className={styles.dialogBackdrop} onClick={() => { if (!mutatingMessageId) setDeleteTarget(null); }}>
          <section
            className={styles.deleteDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            aria-describedby="delete-message-description"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles.deleteDialogIcon} aria-hidden="true">!</span>
            <h3 id="delete-message-title">Delete this message?</h3>
            <p id="delete-message-description">
              The message will be removed from the conversation for everyone in this group. This action cannot be undone.
            </p>
            <div className={styles.deleteDialogActions}>
              <button type="button" className={styles.deleteCancel} disabled={mutatingMessageId === deleteTarget.id} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className={styles.deleteConfirm} disabled={mutatingMessageId === deleteTarget.id} onClick={() => void confirmDeleteMessage()}>
                {mutatingMessageId === deleteTarget.id ? "Deleting…" : "Delete message"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
