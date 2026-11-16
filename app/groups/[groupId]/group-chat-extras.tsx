"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./group-chat.module.css";

const BUCKET = "akiba-group-chat-attachments";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "application/pdf": "pdf", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

type AttachmentRow = {
  id: string;
  group_id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

function fileTypeLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "DOC";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "XLS";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "PPT";
  if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp" || mimeType === "image/gif") return "IMG";
  return "FILE";
}

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(0) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

export function GroupChatAttachmentList({ groupId, messageId, deleted = false, refreshKey = 0 }: {
  groupId: string;
  messageId: string;
  deleted?: boolean;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<AttachmentRow[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const client = createClient();
    void client.from("akiba_group_chat_attachments")
      .select("id,group_id,message_id,storage_path,file_name,mime_type,file_size,created_at")
      .eq("group_id", groupId)
      .eq("message_id", messageId)
      .order("created_at", { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) {
          // A message without attachment metadata is still a normal chat message.
          // In particular, don't render a misleading error under every bubble
          // while the attachments schema is not yet present in this environment.
          setItems([]);
          setError("");
          return;
        }
        setError("");
        setItems((data ?? []) as AttachmentRow[]);
      });
    return () => { active = false; };
  }, [groupId, messageId, refreshKey]);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    async function loadPreviews() {
      const previewable = items.filter((item) => item.mime_type.startsWith("image/") || item.mime_type === "application/pdf");
      const entries = await Promise.all(previewable.map(async (item) => {
        const { data, error: downloadError } = await createClient().storage.from(BUCKET).download(item.storage_path);
        if (downloadError || !data) return null;
        const url = URL.createObjectURL(data);
        urls.push(url);
        return [item.id, url] as const;
      }));
      if (!active) {
        urls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setPreviews(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
    }
    if (!deleted) void loadPreviews();
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [items, deleted]);

  async function download(item: AttachmentRow) {
    const { data, error: downloadError } = await createClient().storage.from(BUCKET).download(item.storage_path);
    if (downloadError || !data) {
      setError("This file couldn't be downloaded. Check that you're still a group member and try again.");
      return;
    }
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.file_name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (deleted || items.length === 0) return error ? <small className={styles.attachmentError}>{error}</small> : null;

  return (
    <div className={styles.attachmentList}>
      {items.map((item) => (
        <div className={styles.attachmentItem} key={item.id}>
          {item.mime_type.startsWith("image/") && previews[item.id] ? (
            <button type="button" className={styles.attachmentImageButton} onClick={() => void download(item)} aria-label={"Download " + item.file_name}>
              <img src={previews[item.id]} alt={item.file_name} />
            </button>
          ) : item.mime_type === "application/pdf" && previews[item.id] ? (
            <iframe className={styles.attachmentPdfPreview} src={previews[item.id]} title={"PDF preview: " + item.file_name} loading="lazy" />
          ) : (
            <span className={styles.attachmentFileIcon} aria-hidden="true">{fileTypeLabel(item.mime_type)}</span>
          )}
          <div className={styles.attachmentDetails}>
            <b title={item.file_name}>{item.file_name}</b>
            <small>{formatBytes(item.file_size)}</small>
          </div>
          <button type="button" className={styles.attachmentDownload} onClick={() => void download(item)}>Download</button>
        </div>
      ))}
      {error && <small className={styles.attachmentError}>{error}</small>}
    </div>
  );
}

export function GroupChatAttachmentPicker({ files, onFilesChange, disabled = false }: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const MAX_FILES = 10;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

  function chooseFiles(selected: FileList | null) {
    if (!selected?.length) return;
    const incoming = Array.from(selected);
    const invalid = incoming.find((file) => !ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE);
    if (invalid) {
      setError(!ALLOWED_TYPES.has(invalid.type)
        ? "Choose images, PDFs, Word, Excel or PowerPoint files."
        : "Each file must be smaller than 15 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const combined = [...files, ...incoming];
    if (combined.length > MAX_FILES) {
      setError("You can attach up to 10 files to one message.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (combined.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_SIZE) {
      setError("The combined attachments must be smaller than 50 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onFilesChange(combined);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={styles.attachmentComposer}>
      <input
        ref={inputRef}
        className={styles.srOnly}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        disabled={disabled}
        onChange={(event) => chooseFiles(event.currentTarget.files)}
        aria-label="Choose files to attach"
      />
      <button type="button" className={styles.attachButton} disabled={disabled} onClick={() => inputRef.current?.click()} aria-label="Attach files" title="Attach files">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m21.4 11.1-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
        </svg>
      </button>
      {files.length > 0 && (
        <div className={styles.pendingAttachments} aria-live="polite">
          {files.map((file, index) => (
            <div className={styles.pendingAttachment} key={index}>
              <span>{file.type.startsWith("image/") ? "IMG" : file.type === "application/pdf" ? "PDF" : "FILE"}</span>
              <b title={file.name}>{file.name}</b>
              <small>{formatBytes(file.size)}</small>
              <button type="button" onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))} disabled={disabled} aria-label={"Remove " + file.name}>×</button>
            </div>
          ))}
        </div>
      )}
      {error && <small className={styles.attachmentError} role="alert">{error}</small>}
    </div>
  );
}

export async function uploadGroupChatAttachments(groupId: string, currentUserId: string, messageId: string, files: File[]) {
  if (!files.length) return;
  const client = createClient();
  const uploadedPaths: string[] = [];
  try {
    const rows = [];
    for (const file of files) {
      const extension = EXTENSIONS[file.type];
      const storagePath = groupId + "/" + currentUserId + "/" + crypto.randomUUID() + "." + extension;
      const { error } = await client.storage.from(BUCKET).upload(storagePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploadedPaths.push(storagePath);
      rows.push({
        group_id: groupId,
        message_id: messageId,
        uploaded_by: currentUserId,
        storage_path: storagePath,
        file_name: file.name.slice(0, 255),
        mime_type: file.type,
        file_size: file.size,
      });
    }
    const { error: metadataError } = await client.from("akiba_group_chat_attachments").insert(rows);
    if (metadataError) throw new Error(metadataError.message);
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from(BUCKET).remove(uploadedPaths);
    throw error;
  }
}

type PresenceUser = { user_id: string; display_name: string; online_at: string };

function relativeLastSeen(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
}

export function GroupChatPresence({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [lastSeen, setLastSeen] = useState<Record<string, string | null>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const onlineRef = useRef<PresenceUser[]>([]);
  const [, setClock] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    const client = createClient();
    let channel: ReturnType<typeof client.channel> | null = null;

    async function start() {
      const [{ data: profile }, { data: presenceRows }] = await Promise.all([
        client.from("akiba_profiles").select("display_name,username").eq("user_id", currentUserId).maybeSingle(),
        client.rpc("akiba_list_group_chat_presence", { p_group_id: groupId }),
      ]);
      if (!active) return;
      const displayName = profile?.display_name?.trim() || profile?.username || "Akiba member";
      const { error: touchError } = await client.rpc("akiba_touch_group_chat_presence", { p_group_id: groupId });
      if (touchError) return;
      const initial = (presenceRows ?? []) as { user_id: string; last_seen_at: string | null }[];
      setLastSeen(Object.fromEntries(initial.map((row) => [row.user_id, row.last_seen_at])));
      const otherIds = initial.map((row) => row.user_id).filter((id) => id !== currentUserId);
      const { data: memberProfiles } = otherIds.length
        ? await client.from("akiba_profiles").select("user_id,display_name,username").in("user_id", otherIds)
        : { data: [] };
      if (!active) return;
      setNames((current) => {
        const next = { ...current, [currentUserId]: displayName };
        for (const person of memberProfiles ?? []) next[person.user_id] = person.display_name?.trim() || person.username || "Akiba member";
        return next;
      });

      channel = client.channel("group:" + groupId + ":presence", {
        config: { private: true, presence: { key: currentUserId } },
      });
      channel.on("presence", { event: "sync" }, () => {
        if (!active || !channel) return;
        const state = channel.presenceState<PresenceUser>();
        const presences = Object.values(state).flat().filter((person) => Boolean(person.user_id));
        const uniquePeople = Array.from(new Map(presences.map((person) => [person.user_id, person])).values());
        const nextIds = new Set(uniquePeople.map((person) => person.user_id));
        const now = new Date().toISOString();
        setLastSeen((current) => {
          const next = { ...current };
          for (const previous of onlineRef.current) {
            if (!nextIds.has(previous.user_id)) next[previous.user_id] = now;
          }
          return next;
        });
        onlineRef.current = uniquePeople;
        setOnline(uniquePeople);
        setNames((current) => {
          const next = { ...current };
          for (const person of uniquePeople) next[person.user_id] = person.display_name || "Akiba member";
          return next;
        });
      });
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && active && channel) {
          await channel.track({ user_id: currentUserId, display_name: displayName, online_at: new Date().toISOString() });
        }
      });
    }

    void start();
    const markActivity = () => {
      void client.rpc("akiba_touch_group_chat_presence", { p_group_id: groupId });
    };
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void client.rpc("akiba_touch_group_chat_presence", { p_group_id: groupId });
      }
    }, 60_000);
    const clock = window.setInterval(() => setClock((value) => value + 1), 60_000);
    document.addEventListener("visibilitychange", markActivity);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", markActivity);
      window.clearInterval(heartbeat);
      window.clearInterval(clock);
      void client.rpc("akiba_touch_group_chat_presence", { p_group_id: groupId });
      if (channel) void client.removeChannel(channel);
    };
  }, [groupId, currentUserId]);

  const onlineIds = new Set(online.map((person) => person.user_id));
  const offlineIds = Object.keys(lastSeen).filter((userId) => userId !== currentUserId && !onlineIds.has(userId));
  const othersOnline = online.filter((person) => person.user_id !== currentUserId);

  return (
    <div className={styles.presenceBar} aria-live="polite">
      <span className={styles.presenceCount}><i />{online.length} online</span>
      {othersOnline.length > 0 && <span>{othersOnline.slice(0, 3).map((person) => names[person.user_id] || person.display_name).join(", ")}{othersOnline.length > 3 ? " +" + (othersOnline.length - 3) : ""}</span>}
      {offlineIds.length > 0 && <span className={styles.lastSeenText}>Recently active: {offlineIds.slice(0, 2).map((id) => (names[id] || "Member") + " " + relativeLastSeen(lastSeen[id])).join(" · ")}</span>}
    </div>
  );
}
