import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell from "@/app/workspace/notification-bell";
import MessageBell from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import GroupChat from "@/app/groups/[groupId]/group-chat";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

type Props = { params: Promise<{ groupId: string }> };

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

export default async function GroupChatPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
    supabase.from("akiba_groups").select("id,name,created_by").eq("id", groupId).maybeSingle(),
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
  ]);
  if (groupError || !group) notFound();
  if (!profile?.display_name?.trim()) redirect("/onboarding");

  const { data: membership } = await supabase.from("akiba_group_memberships")
    .select("status,role").eq("group_id", group.id).eq("user_id", user.id).maybeSingle();
  if (!membership || membership.status !== "active") notFound();
  const isCreator = group.created_by === user.id && membership.role === "group_creator";

  const { data: unreadRows } = await supabase.rpc("akiba_list_my_group_chat_unread_counts");
  const chatUnreadCount = Number(((unreadRows ?? []) as { group_id: string; unread_count: number | string }[])
    .find((row) => row.group_id === group.id)?.unread_count ?? 0);

  const avatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <NotificationRealtime />
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link active"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <NotificationSidebarLink />
          <MessagesSidebarLink />
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <Link href="/workspace/profile" className="ak-nav-link"><span>♙</span>Edit Profile</Link>
          <Link href="/workspace/account-settings" className="ak-nav-link"><span>⚙</span>Account Settings</Link>
        </nav>
        <div className="ak-sidebar-bottom">
          <div className="ak-sidebar-promo"><span className="ak-promo-mark">✳</span><strong>Do more, together</strong><p>Bring people together around the things that matter.</p><Link href="/workspace/new">Create a group <span>→</span></Link></div>
          <div className="ak-sidebar-user">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{initials(profile.display_name)}</span>}
            <span className="ak-sidebar-user-copy"><strong>{profile.display_name}</strong><small>@{profile.username}</small></span>
            <form action={signOut}><button type="submit" aria-label="Sign out" title="Sign out">↗</button></form>
          </div>
        </div>
      </aside>

      <section className="ak-main">
        <header className="ak-topbar">
          <div className="ak-mobile-brand"><img src="/akiba-logo.png" alt="" />Akiba</div>
          <div className="ak-workspace-top-crumb"><Link href="/workspace/groups">My Groups</Link><span>/</span><Link href={"/workspace/groups/" + group.id}>{group.name}</Link><span>/</span><strong>Chat</strong></div>
          <div className="ak-topbar-right"><NotificationBell /><MessageBell /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-finance-heading">
            <div>
              <Link className="ak-workspace-back" href={"/workspace/groups/" + group.id}>← Back to {group.name}</Link>
              <span className="ak-section-eyebrow">GROUP WORKSPACE</span>
              <h1>Group chat</h1>
              <p>Coordinate with the people in this group. Messages stay within this group conversation.</p>
            </div>
          </section>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <Link href={"/workspace/groups/" + group.id}><DashboardOutlinedIcon />Overview</Link>
            <Link href={"/workspace/groups/" + group.id + "/finances"}><AccountBalanceWalletOutlinedIcon />Finances</Link>
            <Link href={"/workspace/groups/" + group.id + "/membership"}><GroupsOutlinedIcon />Membership</Link>
            <Link className="active" aria-current="page" href={"/workspace/groups/" + group.id + "/chat"}><ChatBubbleOutlineOutlinedIcon />Chat{chatUnreadCount > 0 && <span className="ak-group-tab-unread-badge">{chatUnreadCount > 99 ? "99+" : chatUnreadCount}</span>}</Link>
            {isCreator ?             <Link href={`/workspace/groups/${group.id}/settings`}><SettingsOutlinedIcon />Settings</Link> :             <span aria-disabled="true" title="Only the Group Creator can access group settings"><SettingsOutlinedIcon />Settings</span>}
          </nav>

          <GroupChat groupId={group.id} />
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
