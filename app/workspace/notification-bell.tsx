"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const trayRootRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);
  const [notifications, setNotifications] = useState(initialNotifications ?? []);
  const router = useRouter();


  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!trayRootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
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
    let channel: ReturnType<typeof client.channel> | null = null;
    void client.auth.getUser().then(({ data, error }) => {
      if (!active || error || !data.user) return;
      channel = client.channel("user:" + data.user.id + ":notifications", { config: { private: true } })
        .on("broadcast", { event: "notification_created" }, () => { void load(); })
        .on("broadcast", { event: "notification_updated" }, () => { void load(); })
        .on("broadcast", { event: "group_unread_updated" }, () => { void load(); })
        .subscribe();
      void load();
    });
    return () => {
      active = false;
      if (channel) void client.removeChannel(channel);
    };
  }, []);


  async function openNotification(id: string, href: string, wasUnread: boolean) {
    if (wasUnread) {
      const previous = notifications;
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      const client = createClient();
      const { error } = await client.rpc("akiba_mark_group_notification_read", { p_notification_id: id });
      if (error) {
        setNotifications(previous);
        setUnreadCount((count) => count + 1);
      }
    }
    router.push(href);
    router.refresh();
  }

  return (
    <div className="ak-notification-bell" ref={trayRootRef}>
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
                const isUnread = !item.read_at;
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
