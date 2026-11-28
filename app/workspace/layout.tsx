import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import WorkspaceSidebar from "@/app/workspace/workspace-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [{ data: profile }, { count: groupCount }, { data: invitations }] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_groups").select("id", { count: "exact", head: true }),
    supabase.rpc("akiba_list_my_group_invitations"),
  ]);
  if (!profile?.display_name?.trim()) redirect("/onboarding");

  const avatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;

  return (
    <div className="ak-workspace-layout">
      <WorkspaceSidebar
        displayName={profile.display_name}
        username={profile.username}
        avatarUrl={avatarUrl}
        groupCount={groupCount ?? 0}
        invitationCount={(invitations ?? []).length}
      />
      {children}
    </div>
  );
}
