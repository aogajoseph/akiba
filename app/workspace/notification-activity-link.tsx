"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [isUnread, setIsUnread] = useState(unread);
  async function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (isUnread) {
      setIsUnread(false);
      const client = createClient();
      const { error } = await client.rpc("akiba_mark_group_notification_read", { p_notification_id: id });
      if (error) setIsUnread(true);
    }
    router.push(href);
    router.refresh();
  }

  return (
    <Link href={href} className={"ak-activity-row" + (isUnread ? " is-unread" : "")} onClick={open}>
      <span className="ak-activity-icon">{eventType === "chat_message" ? "▣" : eventType.startsWith("invitation") ? "✉" : "♧"}</span>
      <div><strong>{title}</strong><p>{body}</p><small>{date}</small></div>
      {isUnread && <span className="ak-activity-unread-dot" aria-label="Unread" />}
    </Link>
  );
}
