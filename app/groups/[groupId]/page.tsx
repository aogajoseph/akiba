"use client";

import { useParams } from "next/navigation";
import GroupChat from "./group-chat";

export default function GroupWorkspacePage() {
  const params = useParams<{ groupId: string }>();
  return <GroupChat groupId={params.groupId} />;
}
