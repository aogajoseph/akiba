"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { createClient } from "@/lib/supabase/client";

export default function MessagesSidebarLink({ active = false }: { active?: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const client = createClient();
    const refresh = async () => {
      const { data, error } = await client.rpc("akiba_list_my_group_chat_unread_summaries");
      if (mounted && !error) setCount(((data ?? []) as { unread_count: number | string }[]).reduce((sum, row) => sum + Number(row.unread_count), 0));
    };
    let channel: ReturnType<typeof client.channel> | null = null;
    void client.auth.getUser().then(({ data, error }) => {
      if (!mounted || error || !data.user) return;
      channel = client.channel("user:" + data.user.id + ":notifications", { config: { private: true } })
        .on("broadcast", { event: "group_unread_updated" }, () => { void refresh(); }).subscribe();
      void refresh();
    });
    return () => { mounted = false; if (channel) void client.removeChannel(channel); };
  }, []);
  return <Link href="/workspace/chat" className={"ak-nav-link" + (active ? " active" : "")} aria-current={active ? "page" : undefined}><span className="ak-nav-icon"><InboxOutlinedIcon /></span><span className="ak-nav-text">Inbox</span>{count > 0 ? <small>{count > 99 ? "99+" : count}</small> : null}</Link>;
}
