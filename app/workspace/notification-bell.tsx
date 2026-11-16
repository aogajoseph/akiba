"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type NotificationBellItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  event_type: string;
  created_at: string;
  read_at: string | null;
};

type Props = {
  unreadCount: number;
  notifications: NotificationBellItem[];
};

export default function NotificationBell({ unreadCount: initialUnreadCount, notifications }: Props) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [readIds, setReadIds] = useState<string[]>([]);
  const router = useRouter();

  async function markRead(id: string, wasUnread: boolean) {
    if (!wasUnread || readIds.includes(id)) return;
    setReadIds((current) => [...current, id]);
    setUnreadCount((count) => Math.max(0, count - 1));
    const client = createClient();
    const { error } = await client.rpc("akiba_mark_group_notification_read", { p_notification_id: id });
    if (error) {
      setReadIds((current) => current.filter((item) => item !== id));
      setUnreadCount((count) => count + 1);
      return;
    }
    router.refresh();
  }

  return (
    <div className="ak-notification-bell">
      <button
        type="button"
        className="ak-notification-bell-trigger"
        aria-label={unreadCount > 0 ? "Notifications, " + unreadCount + " unread" : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {unreadCount > 0 && <span className="ak-notification-bell-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="ak-notification-tray" role="dialog" aria-label="Recent notifications">
          <div className="ak-notification-tray-heading"><strong>Notifications</strong><span>{unreadCount} unread</span></div>
          {notifications.length === 0 ? <p className="ak-notification-tray-empty">You’re all caught up.</p> : (
            <div className="ak-notification-tray-list">
              {notifications.map((item) => {
                const isUnread = !item.read_at && !readIds.includes(item.id);
                return (
                  <Link
                    href={item.href}
                    className={"ak-notification-tray-item" + (isUnread ? " is-unread" : "")}
                    key={item.id}
                    onClick={() => void markRead(item.id, isUnread)}
                  >
                    <span className="ak-notification-tray-dot" />
                    <span><strong>{item.title}</strong><small>{item.body}</small><time>{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.created_at))}</time></span>
                  </Link>
                );
              })}
            </div>
          )}
          <Link className="ak-notification-tray-footer" href="/workspace/notifications" onClick={() => setOpen(false)}>See all notifications →</Link>
        </div>
      )}
    </div>
  );
}
