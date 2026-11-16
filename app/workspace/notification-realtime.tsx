"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function NotificationRealtime() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;
    const client = createClient();

    void client.auth.getUser().then(({ data, error }) => {
      if (!active || error || !data.user) return;
      channel = client
        .channel("user:" + data.user.id + ":notifications", { config: { private: true } })
        .on("broadcast", { event: "notification_created" }, () => {
          if (active) router.refresh();
        })
        .on("broadcast", { event: "notification_updated" }, () => {
          if (active) router.refresh();
        })
        .on("broadcast", { event: "group_unread_updated" }, () => {
          if (active) router.refresh();
        })
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) void client.removeChannel(channel);
    };
  }, [router]);

  return null;
}
