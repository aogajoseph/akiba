import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { acceptGroupInvitationById, declineGroupInvitationById } from "@/app/workspace/actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell, { type NotificationBellItem } from "@/app/workspace/notification-bell";
import MessageBell from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import NotificationActivityLink from "@/app/workspace/notification-activity-link";

type Group = {
  id: string;
  name: string;
  purpose: string;
  group_type: string;
  description: string | null;
  currency_code: string;
  created_at: string;
};

type Invitation = {
  invitation_id: string;
  group_id: string;
  group_name: string;
  group_description: string | null;
  inviter_display_name: string | null;
  inviter_username: string | null;
  expires_at: string;
  created_at: string;
};

type Notification = NotificationBellItem & { group_id: string };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value));
}

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const [{ data: profile, error: profileError }, { data: groups, error: groupsError }, { data: invitations, error: invitationsError }, { data: notifications, error: notificationsError }, { data: unreadNotificationCountData }] = await Promise.all([
    supabase.from("akiba_profiles").select("username, display_name, avatar_path").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_groups").select("id,name,purpose,group_type,description,currency_code,created_at").order("created_at", { ascending: false }),
    supabase.rpc("akiba_list_my_group_invitations"),
    supabase.rpc("akiba_list_my_group_notifications", { p_limit: 5 }),
    supabase.rpc("akiba_count_my_unread_group_notifications"),
  ]);

  if (profileError || !profile?.display_name?.trim()) redirect("/onboarding");

  const unreadNotificationCount = Number(unreadNotificationCountData ?? 0);
  const notificationRows = (notifications ?? []) as Notification[];
  const groupRows = (groups ?? []) as Group[];
  const invitationRows = (invitations ?? []) as Invitation[];
  const groupIds = groupRows.map((group) => group.id);
  let messageCount: number | null = 0;
  let messageError = false;
  if (groupIds.length > 0) {
    const messageCountResult = await supabase.from("akiba_group_messages").select("id", { count: "exact", head: true }).in("group_id", groupIds);
    messageCount = messageCountResult.count;
    messageError = Boolean(messageCountResult.error);
  }

  const avatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;
  const displayName = profile.display_name;
   const firstName = displayName.trim().split(/\s+/)[0];

  return (
    <main className="ak-dashboard">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link active"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups{groupRows.length > 0 && <small>{groupRows.length}</small>}</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations{(invitations ?? []).length > 0 && <small>{(invitations ?? []).length}</small>}</Link>
          <NotificationSidebarLink />
          <MessagesSidebarLink />
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <Link href="/workspace/profile" className="ak-nav-link"><span>♙</span>My Profile</Link>
          <Link href="/workspace/account-settings" className="ak-nav-link"><span>⚙</span>Account Settings</Link>
        </nav>
        <div className="ak-sidebar-bottom">
          <div className="ak-sidebar-promo"><span className="ak-promo-mark">✳</span><strong>Do more, together</strong><p>Bring people together around the things that matter.</p><Link href="/workspace/new">Create a group <span>→</span></Link></div>
          <div className="ak-sidebar-user">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{initials(displayName)}</span>}
            <span className="ak-sidebar-user-copy"><strong>{displayName}</strong><small>@{profile.username}</small></span>
            <form action={signOut}><button type="submit" aria-label="Sign out" title="Sign out">↗</button></form>
          </div>
        </div>
      </aside>

      <NotificationRealtime />
      <section className="ak-main">
        <header className="ak-topbar">
          <div className="ak-mobile-brand"><img src="/akiba-logo.png" alt="" />Akiba</div>
          <div className="ak-search-placeholder"><span>⌕</span><span>Search groups, chats, or people...</span></div>
          <div className="ak-topbar-right"><NotificationBell unreadCount={unreadNotificationCount} notifications={notificationRows.slice(0, 5)} /><MessageBell /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(displayName)}</div></div>
        </header>

        <div className="ak-dashboard-content">
          <div className="ak-welcome">
            <div><div className="ak-eyebrow">YOUR DASHBOARD</div><h1>Welcome back, {firstName} <span aria-hidden="true">👋</span></h1><p>Here&apos;s what&apos;s happening across your groups.</p></div>
            <Link href="/workspace/new" className="ak-primary"><span>＋</span> Create New Group</Link>
          </div>

          {groupsError && <div className="ak-alert" role="alert">We couldn&apos;t load your groups. Please refresh the page and try again.</div>}

          {invitationsError ? (
            <section className="ak-panel" aria-labelledby="pending-invitations-heading">
              <div className="ak-panel-heading"><div><h2 id="pending-invitations-heading">Group invitations</h2><p>We couldn&apos;t check for pending invitations. Please refresh the page.</p></div></div>
            </section>
          ) : invitationRows.length > 0 ? (
            <section className="ak-panel ak-invitations-panel" aria-labelledby="pending-invitations-heading">
              <div className="ak-panel-heading"><div><span className="ak-eyebrow">ACTION NEEDED</span><h2 id="pending-invitations-heading">You&apos;ve been invited to join a group</h2><p>Review your invitations and choose whether to join.</p></div><span className="ak-panel-count">{invitationRows.length} pending</span></div>
              <div className="ak-workspace-member-list">
                {invitationRows.map((invite) => (
                  <article className="ak-workspace-member ak-inbox-invitation" key={invite.invitation_id}>
                    <span className="ak-workspace-member-fallback" aria-hidden="true">♧</span>
                    <div>
                      <strong>{invite.group_name}</strong>
                      <small>Invited by {invite.inviter_display_name || (invite.inviter_username ? "@" + invite.inviter_username : "A group member")}</small>
                      {invite.group_description ? <p>{invite.group_description}</p> : null}
                      <small>Expires {new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(invite.expires_at))}</small>
                    </div>
                    <div className="ak-inbox-actions">
                      <form action={acceptGroupInvitationById}><input type="hidden" name="invitation_id" value={invite.invitation_id} /><input type="hidden" name="return_to" value="/workspace" /><button type="submit" className="workspace-primary">Accept</button></form>
                      <form action={declineGroupInvitationById}><input type="hidden" name="invitation_id" value={invite.invitation_id} /><input type="hidden" name="return_to" value="/workspace" /><button type="submit" className="ak-member-danger">Decline</button></form>
                    </div>
                  </article>
                ))}
              </div>
              <Link className="ak-panel-footer" href="/workspace/invitations">View all invitations</Link>
            </section>
          ) : null}

          <div className="ak-metrics">
            <article className="ak-metric"><span className="ak-metric-icon pink">♧</span><span className="ak-metric-label">My Groups</span><strong>{groupsError ? "—" : groupRows.length}</strong><small>{groupRows.length === 1 ? "1 group to organise" : "Your shared spaces"}</small></article>
            <article className="ak-metric"><span className="ak-metric-icon violet">▤</span><span className="ak-metric-label">Group Messages</span><strong>{messageError ? "—" : messageCount ?? 0}</strong><small>{messageError ? "Couldn't load messages" : "Messages across your groups"}</small></article>
            <article className="ak-metric"><span className="ak-metric-icon green">↗</span><span className="ak-metric-label">Group Updates</span><strong>{notificationsError ? "—" : notificationRows.length}</strong><small>{notificationsError ? "Couldn't load updates" : "Latest notifications"}</small></article>
            <article className="ak-metric"><span className="ak-metric-icon amber">✓</span><span className="ak-metric-label">Profile</span><strong className="ak-metric-status">Complete</strong><small>Your account is ready</small></article>
          </div>

          <div className="ak-dashboard-grid">
            <div className="ak-dashboard-primary">
              <section className="ak-panel" id="your-groups">
                <div className="ak-panel-heading"><div><h2>Your Groups</h2><p>Shared plans and purposes you&apos;re part of.</p></div>{groupRows.length > 0 && <span className="ak-panel-count">{groupRows.length} total</span>}</div>
                {groupsError ? <div className="ak-inline-error">Your groups couldn&apos;t be loaded. <a href="/workspace">Try again</a>.</div> : groupRows.length === 0 ? (
                  <div className="ak-empty"><span className="ak-empty-icon">♧</span><h3>Your first group starts here</h3><p>Create a group for a celebration, a family goal, a trip or anything you want to organise together.</p><Link href="/workspace/new" className="ak-primary">＋ Create your first Group</Link></div>
                ) : (
                  <div className="ak-group-list">{groupRows.slice(0, 5).map((group) => <Link href={"/workspace/groups/" + group.id} className="ak-group-row" key={group.id}><span className={"ak-group-icon " + (group.purpose === "event" ? "event" : "goal")}>{group.purpose === "event" ? "▦" : "◎"}</span><span className="ak-group-copy"><strong>{group.name}</strong><small>{group.purpose === "event" ? "Event" : group.purpose === "chama" ? "Chama" : "Goal"} · {group.group_type.replaceAll("_", " ")} · {group.currency_code}{group.description ? " · " + group.description : ""}</small></span><span className="ak-group-date">{shortDate(group.created_at)}</span><span className="ak-chevron">›</span></Link>)}</div>
                )}
                {groupRows.length > 5 && <Link className="ak-panel-footer" href="/workspace/groups">See all your groups</Link>}
              </section>

              <section className="ak-purpose-banner"><div className="ak-banner-logo"><img src="/akiba-logo.png" alt="" /></div><div><h2>Do more, together</h2><p>Create a group, bring people together, and turn your plans into reality.</p></div><Link href="/workspace/new" className="ak-primary">＋ Create Group</Link></section>

              <section className="ak-panel ak-activity-panel">
                <div className="ak-panel-heading"><div><h2>Recent Activity</h2><p>Your five latest notifications across all groups.</p></div></div>
                {notificationsError ? <div className="ak-inline-error">Recent notifications couldn&apos;t be loaded.</div> : notificationRows.length === 0 ? <div className="ak-empty ak-empty-compact"><span className="ak-empty-icon">◷</span><h3>No notifications yet</h3><p>Updates from your groups will appear here.</p></div> : <div className="ak-activity-list">{notificationRows.map((item) => <NotificationActivityLink key={item.id} id={item.id} href={item.href} unread={!item.read_at} title={item.title} body={item.body} date={shortDate(item.created_at)} eventType={item.event_type} />)}</div>}
                <Link className="ak-panel-footer" href="/workspace/notifications">See all notifications</Link>
              </section>
            </div>

            <aside className="ak-dashboard-aside">
              <section className="ak-panel ak-quick-panel"><div className="ak-panel-heading"><h2>Quick Actions</h2></div><Link href="/workspace/new" className="ak-quick-action"><span className="ak-quick-icon pink">♧</span><span><strong>Create New Group</strong><small>Start organising together</small></span><b>›</b></Link><Link href="/workspace/groups" className="ak-quick-action"><span className="ak-quick-icon violet">▤</span><span><strong>Explore My Groups</strong><small>View all your shared spaces</small></span><b>›</b></Link></section>
              <section className="ak-panel ak-upcoming-panel"><div className="ak-panel-heading"><h2>Upcoming &amp; Pending</h2></div><div className="ak-empty ak-empty-compact"><span className="ak-empty-icon">▦</span><h3>Nothing scheduled yet</h3><p>Events, contribution schedules and approvals will appear here as those features become available.</p></div><div className="ak-feature-note">Scheduling and approvals aren&apos;t enabled in this release.</div></section>
              <section className="ak-note-card"><span>✳</span><strong>Do more, together</strong><p>Akiba helps people organise shared plans and purposes in one place.</p></section>
            </aside>
          </div>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
