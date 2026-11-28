"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { createClient } from "@/lib/supabase/client";

export default function NotificationSidebarLink({ active = false }: { active?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const client = createClient();
    const refreshCount = async () => {
      const { data, error } = await client.rpc("akiba_count_my_unread_group_notifications");
      if (mounted && !error) setCount(Number(data ?? 0));
    };
    let channel: ReturnType<typeof client.channel> | null = null;
    void client.auth.getUser().then(({ data, error }) => {
      if (!mounted || error || !data.user) return;
      channel = client.channel("user:" + data.user.id + ":notifications", { config: { private: true } })
        .on("broadcast", { event: "notification_created" }, () => { void refreshCount(); })
        .on("broadcast", { event: "notification_updated" }, () => { void refreshCount(); })
        .subscribe();
      void refreshCount();
    });
    return () => {
      mounted = false;
      if (channel) void client.removeChannel(channel);
    };
  }, []);

  return <Link href="/workspace/notifications" className={"ak-nav-link" + (active ? " active" : "")} aria-current={active ? "page" : undefined}><span className="ak-nav-icon"><NotificationsNoneOutlinedIcon /></span><span className="ak-nav-text">Notifications</span>{count > 0 ? <small>{count > 99 ? "99+" : count}</small> : null}</Link>;
}
