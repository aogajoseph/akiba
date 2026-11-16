"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  id: string;
  href: string;
  unread: boolean;
  title: string;
  body: string;
  date: string;
  eventType: string;
};

export default function NotificationActivityLink({ id, href, unread, title, body, date, eventType }: Props) {
  const router = useRouter();
  async function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (unread) {
      const client = createClient();
      await client.rpc("akiba_mark_group_notification_read", { p_notification_id: id });
    }
    router.push(href);
    router.refresh();
  }

  return (
    <Link href={href} className="ak-activity-row" onClick={open}>
      <span className="ak-activity-icon">{eventType === "chat_message" ? "▣" : eventType.startsWith("invitation") ? "✉" : "♧"}</span>
      <div><strong>{title}</strong><p>{body}</p><small>{date}</small></div>
      {unread && <span className="ak-activity-unread-dot" aria-label="Unread" />}
    </Link>
  );
}
