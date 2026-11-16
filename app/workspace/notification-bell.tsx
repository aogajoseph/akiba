"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  unreadCount?: number;
  notifications?: NotificationBellItem[];
};

export default function NotificationBell({ unreadCount: initialUnreadCount, notifications: initialNotifications }: Props) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);
  const [notifications, setNotifications] = useState(initialNotifications ?? []);
  const [readIds, setReadIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (initialUnreadCount !== undefined && initialNotifications !== undefined) {
      setUnreadCount(initialUnreadCount);
      setNotifications(initialNotifications);
      return;
    }
    let active = true;
    const client = createClient();
    const load = async () => {
      const [{ data: count }, { data: items }] = await Promise.all([
        client.rpc("akiba_count_my_unread_group_notifications"),
        client.rpc("akiba_list_my_group_notifications", { p_limit: 5 }),
      ]);
      if (!active) return;
      setUnreadCount(Number(count ?? 0));
      setNotifications((items ?? []) as NotificationBellItem[]);
    };
    void load();
    return () => { active = false; };
  }, [initialUnreadCount, initialNotifications]);

  async function openNotification(id: string, href: string, wasUnread: boolean) {
    if (wasUnread && !readIds.includes(id)) {
      setReadIds((current) => [...current, id]);
      setUnreadCount((count) => Math.max(0, count - 1));
      const client = createClient();
      const { error } = await client.rpc("akiba_mark_group_notification_read", { p_notification_id: id });
      if (error) {
        setReadIds((current) => current.filter((item) => item !== id));
        setUnreadCount((count) => count + 1);
      }
    }
    router.push(href);
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
                    onClick={(event) => { event.preventDefault(); void openNotification(item.id, item.href, isUnread); }}
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
