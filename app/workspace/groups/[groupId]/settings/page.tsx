import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell, { type NotificationBellItem } from "@/app/workspace/notification-bell";
import MessageBell from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import GroupSettingsForm from "./group-settings-form";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

function initials(value: string) {
  return value.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

export default async function GroupSettingsPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
    supabase.from("akiba_groups")
      .select("id,name,purpose,group_type,description,currency_code,target_amount,event_date,event_location,deadline,group_image_path,created_by,status")
      .eq("id", groupId)
      .maybeSingle(),
    supabase.from("akiba_profiles")
      .select("username,display_name,avatar_path")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (groupError || !group) notFound();
  if (!profile?.display_name?.trim()) redirect("/onboarding");

  const { data: membership } = await supabase.from("akiba_group_memberships")
    .select("role,status")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.status !== "active") notFound();

  const isCreator = group.created_by === user.id && membership.role === "group_creator";
  const isSupportedGroup = group.purpose === "event" || group.purpose === "goal";
  const [currencyLockResult, groupUnreadRows, notificationUnreadCount, notificationPreview] = await Promise.all([
    isCreator && isSupportedGroup && group.status === "active"
      ? supabase.rpc("akiba_group_currency_is_locked", { p_group_id: group.id })
      : Promise.resolve({ data: true, error: null }),
    supabase.rpc("akiba_list_my_group_chat_unread_counts"),
    supabase.rpc("akiba_count_my_unread_group_notifications"),
    supabase.rpc("akiba_list_my_group_notifications", { p_limit: 5 }),
  ]);

  const currencyLocked = Boolean(currencyLockResult.error) || currencyLockResult.data !== false;
  const chatUnreadCount = Number(((groupUnreadRows.data ?? []) as { group_id: string; unread_count: number | string }[]).find((row) => row.group_id === group.id)?.unread_count ?? 0);
  const notificationCount = Number(notificationUnreadCount.data ?? 0);
  const notificationRows = (notificationPreview.data ?? []) as NotificationBellItem[];
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const groupImageUrl = group.group_image_path ? supabase.storage.from("group-images").getPublicUrl(group.group_image_path).data.publicUrl : null;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <NotificationRealtime />
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link active"><span>♧</span>My Groups</Link>
          <NotificationSidebarLink />
          <MessagesSidebarLink />
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>♙</span>My Profile</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>⚙</span>Settings</span>
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
          <div className="ak-workspace-top-crumb"><Link href="/workspace/groups">My Groups</Link><span>/</span><Link href={`/workspace/groups/${group.id}`}>{group.name}</Link><span>/</span><strong>Settings</strong></div>
          <div className="ak-topbar-right"><NotificationBell unreadCount={notificationCount} notifications={notificationRows.slice(0, 5)} /><MessageBell /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-workspace-card ak-settings-page-heading">
            <div className="ak-settings-page-identity">
              <div className="ak-settings-page-image">
                {groupImageUrl ? <img src={groupImageUrl} alt={group.name + " group"} /> : <span>{initials(group.name)}</span>}
              </div>
              <div>
                <span className="ak-section-eyebrow">GROUP WORKSPACE</span>
                <h1>{group.name}</h1>
                <p>Manage the information and details associated with this group.</p>
              </div>
            </div>
            <Link className="ak-settings-back-link" href={`/workspace/groups/${group.id}`}>← Back to overview</Link>
          </section>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <Link href={`/workspace/groups/${group.id}`}><DashboardOutlinedIcon />Overview</Link>
            <Link href={`/workspace/groups/${group.id}/finances`}><AccountBalanceWalletOutlinedIcon />Finances</Link>
            <Link href={`/workspace/groups/${group.id}/membership`}><GroupsOutlinedIcon />Membership</Link>
            <Link href={`/workspace/groups/${group.id}/chat`}><ChatBubbleOutlineOutlinedIcon />Chat{chatUnreadCount > 0 && <span className="ak-group-tab-unread-badge">{chatUnreadCount > 99 ? "99+" : chatUnreadCount}</span>}</Link>
            <Link className="active" aria-current="page" href={`/workspace/groups/${group.id}/settings`}><SettingsOutlinedIcon />Settings</Link>
          </nav>

          {query.error && <p className="ak-finance-error" role="alert">{query.error}</p>}
          {query.saved === "1" && <p className="ak-settings-success" role="status">Group settings saved successfully.</p>}

          {!isCreator ? (
            <section className="ak-workspace-card ak-settings-access-warning" role="alert">
              <span className="ak-settings-warning-icon">!</span>
              <div>
                <h2>Group Creator access only</h2>
                <p>Only the Group Creator can access group settings. Contact the Group Creator if you think these details need to be changed.</p>
              </div>
            </section>
          ) : !isSupportedGroup ? (
            <section className="ak-workspace-card ak-settings-access-warning">
              <span className="ak-settings-warning-icon">i</span>
              <div>
                <h2>Settings are not available yet</h2>
                <p>Chama group settings will be introduced progressively as Akiba expands its group capabilities.</p>
              </div>
            </section>
          ) : group.status !== "active" ? (
            <section className="ak-workspace-card ak-settings-access-warning">
              <span className="ak-settings-warning-icon">i</span>
              <div>
                <h2>This group is read-only</h2>
                <p>Deactivated groups cannot be edited. Historical group information remains available during the retention period.</p>
              </div>
            </section>
          ) : (
            <GroupSettingsForm
              group={{
                id: group.id,
                name: group.name,
                purpose: group.purpose,
                group_type: group.group_type,
                description: group.description,
                currency_code: group.currency_code,
                target_amount: group.target_amount,
                event_date: group.event_date,
                event_location: group.event_location,
                deadline: group.deadline,
              }}
              imageUrl={groupImageUrl}
              currencyLocked={currencyLocked}
            />
          )}

          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
