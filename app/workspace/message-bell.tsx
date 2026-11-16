"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UnreadGroupSummary = {
  group_id: string;
  group_name: string;
  unread_count: number | string;
  latest_unread_at: string;
};

function summaryText(item: UnreadGroupSummary) {
  const count = Number(item.unread_count);
  return "You have " + count + " unread " + (count === 1 ? "message" : "messages") + " in ‘" + item.group_name + "’.";
}

export default function MessageBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UnreadGroupSummary[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    const client = createClient();
    const refresh = async () => {
      const { data, error } = await client.rpc("akiba_list_my_group_chat_unread_summaries");
      if (!active || error) return;
      const rows = (data ?? []) as UnreadGroupSummary[];
      setItems(rows.slice(0, 5));
      setTotal(rows.reduce((sum, row) => sum + Number(row.unread_count), 0));
    };
    let channel: ReturnType<typeof client.channel> | null = null;
    void client.auth.getUser().then(({ data, error }) => {
      if (!active || error || !data.user) return;
      channel = client.channel("user:" + data.user.id + ":notifications", { config: { private: true } })
        .on("broadcast", { event: "group_unread_updated" }, () => { void refresh(); })
        .subscribe();
      void refresh();
    });
    return () => { active = false; if (channel) void client.removeChannel(channel); };
  }, []);

  return (
    <div className="ak-message-bell">
      <button type="button" className="ak-message-bell-trigger" aria-label={total > 0 ? "Messages, " + total + " unread" : "Messages"} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.4A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 10h8M8 13h5" /></svg>
        {total > 0 && <span className="ak-message-bell-count">{total > 99 ? "99+" : total}</span>}
      </button>
      {open && <div className="ak-message-tray" role="dialog" aria-label="Unread group messages">
        <div className="ak-notification-tray-heading"><strong>Messages</strong><span>{total} unread</span></div>
        {items.length === 0 ? <p className="ak-notification-tray-empty">You’re all caught up.</p> : <div className="ak-notification-tray-list">{items.map((item) => <Link className="ak-message-tray-item" key={item.group_id} href={"/workspace/groups/" + item.group_id + "/chat"} onClick={() => setOpen(false)}><strong>{summaryText(item)}</strong><time>{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.latest_unread_at))}</time></Link>)}</div>}
        <Link className="ak-notification-tray-footer" href="/workspace/chat" onClick={() => setOpen(false)}>Open Messages inbox →</Link>
      </div>}
    </div>
  );
}
