import Link from "next/link";
import { createHash, randomBytes } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { setGroupAdmin } from "@/app/workspace/actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell, { type NotificationBellItem } from "@/app/workspace/notification-bell";
import MessageBell from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import GroupWorkspaceActions from "./group-workspace-actions";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

type Props = { params: Promise<{ groupId: string }>; searchParams?: Promise<{ membershipError?: string; membershipUpdated?: string }> };
type Member = {
  user_id: string;
  role: "group_creator" | "group_admin" | "member";
  joined_at: string;
  profile?: { display_name: string | null; username: string; avatar_path: string | null };
};

const groupTypeLabels: Record<string, string> = {
  birthday: "Birthday", wedding: "Wedding", graduation: "Graduation", meeting: "Meeting",
  funeral_bereavement: "Funeral & Bereavement", party_celebration: "Party & Celebration",
  trip_vacation: "Trip & Vacation", community_event: "Community Event", fundraiser: "Fundraiser",
  other_event: "Other Event", rent_housing: "Rent & Housing", education: "Education",
  business_investment: "Business & Investment", land_property: "Land & Property", vehicle_purchase: "Vehicle Purchase",
  fundraising: "Fundraising", project_purchase: "Project Purchase", family_support: "Family Support",
  shared_savings: "Shared Savings", community_project: "Community Project", other_goal: "Other Goal",
  rotating_savings: "Rotating Savings", table_banking: "Table Banking", accumulating_savings: "Accumulating Savings",
  investment_chama: "Investment Chama", other_chama: "Other Chama",
};
function initials(value: string) {
  return value.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function money(value: number, currency: string) {
  try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); }
  catch { return currency + " " + value.toLocaleString("en"); }
}

export default async function GroupDetailPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
    supabase.from("akiba_groups").select("id,name,purpose,group_type,description,currency_code,target_amount,event_date,event_location,deadline,group_image_path,group_plan_code,status,deactivated_at,scheduled_delete_at,created_at,created_by").eq("id", groupId).maybeSingle(),
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
  ]);
  if (groupError || !group) notFound();
  if (!profile?.display_name?.trim()) redirect("/onboarding");

  const { data: plan } = await supabase.from("akiba_group_plan_entitlements")
    .select("max_members,required_group_admins,max_group_admins")
    .eq("plan_code", group.group_plan_code).maybeSingle();

  const [{ data: membership }, { data: groupUnreadRows }, { data: notificationUnreadCount }, { data: notificationPreview }, { data: notificationPreference }] = await Promise.all([
    supabase.from("akiba_group_memberships")
      .select("role,status,joined_at").eq("group_id", group.id).eq("user_id", user.id).maybeSingle(),
    supabase.rpc("akiba_list_my_group_chat_unread_counts"),
    supabase.rpc("akiba_count_my_unread_group_notifications"),
    supabase.rpc("akiba_list_my_group_notifications", { p_limit: 5 }),
    supabase.from("akiba_group_notification_preferences")
      .select("is_muted").eq("group_id", group.id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!membership || membership.status !== "active") notFound();
  const chatUnreadCount = Number(((groupUnreadRows ?? []) as { group_id: string; unread_count: number | string }[]).find((row) => row.group_id === group.id)?.unread_count ?? 0);
  const notificationCount = Number(notificationUnreadCount ?? 0);
  const notificationRows = (notificationPreview ?? []) as NotificationBellItem[];
  const groupNotificationsMuted = Boolean(notificationPreference?.is_muted);

  const { data: memberRows, error: membersError } = await supabase.from("akiba_group_memberships")
    .select("user_id,role,joined_at").eq("group_id", group.id).eq("status", "active").order("joined_at", { ascending: true });

  let members: Member[] = [];
  let profilesError = false;
  if (!membersError && memberRows?.length) {
    const ids = memberRows.map((member) => member.user_id);
    const { data: profiles, error } = await supabase.from("akiba_profiles")
      .select("user_id,display_name,username,avatar_path").in("user_id", ids);
    profilesError = Boolean(error);
    const byId = new Map((profiles ?? []).map((item) => [item.user_id, item]));
    members = memberRows.map((member) => ({ ...member, profile: byId.get(member.user_id) ?? undefined }));
  }

  const activeGroupAdminCount = members.filter((member) => member.role === "group_admin").length;
  const requiredGroupAdmins = plan?.required_group_admins ?? 3;
  const leadershipReady = activeGroupAdminCount >= requiredGroupAdmins;
  const isGroupCreator = group.created_by === user.id && membership.role === "group_creator";
  let groupInvitationUrl: string | null = null;
  const configuredSiteUrl = process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl && group.status === "active" && !membersError && members.length < (plan?.max_members ?? 100)) {
    try {
      const siteUrl = new URL(configuredSiteUrl);
      if (siteUrl.protocol === "https:" || siteUrl.hostname === "localhost") {
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const { data: persistentToken, error: linkError } = await supabase.rpc("akiba_get_or_create_group_invite_link", {
          p_group_id: group.id, p_token: token, p_token_hash: tokenHash,
        });
        if (!linkError && persistentToken && /^[0-9a-f]{64}$/.test(persistentToken)) {
          groupInvitationUrl = new URL("/invitations/" + persistentToken, siteUrl).toString();
        } else if (linkError) {
          console.error("Akiba group invitation link could not be loaded", { message: linkError.message });
        }
      }
    } catch (linkError) {
      console.error("Akiba group invitation URL could not be prepared", { message: linkError instanceof Error ? linkError.message : "Unknown error" });
    }
  }
  const purposeLabel = group.purpose === "event" ? "Event" : group.purpose === "chama" ? "Chama" : "Goal";
  const categoryLabel = groupTypeLabels[group.group_type] ?? "Other";
  const groupImageUrl = group.group_image_path ? supabase.storage.from("group-images").getPublicUrl(group.group_image_path).data.publicUrl : null;
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const target = group.target_amount === null ? null : Number(group.target_amount);
  const firstName = profile.display_name.trim().split(/\\s+/)[0];
  const primaryDateMeta = group.purpose === "event" && group.event_date
    ? { label: "Date", value: formatDate(group.event_date) }
    : null;
  const deadlineMeta = group.deadline
    ? { label: "Deadline", value: formatDate(group.deadline) }
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
          <div className="ak-workspace-top-crumb"><Link href="/workspace/groups">My Groups</Link><span>/</span><strong>{group.name}</strong></div>
          <div className="ak-topbar-right"><NotificationBell unreadCount={notificationCount} notifications={notificationRows.slice(0, 5)} /><MessageBell /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-workspace-banner">
            <div className="ak-workspace-banner-image" aria-hidden="true" />
            <div className="ak-workspace-banner-shade" />
            <div className="ak-workspace-hero-content">
              <div className="ak-workspace-group-image">
                {groupImageUrl ? <img src={groupImageUrl} alt={group.name + " group"} /> : <span>{initials(group.name)}</span>}
              </div>
              <div className="ak-workspace-banner-copy">
                <h1>{group.name}</h1>
                <p>{group.description?.trim() || "A shared space for people to come together and make things happen."}</p>
                <div className="ak-workspace-banner-meta" aria-label="Group details">
                  <div className="ak-workspace-banner-meta-row">
                    {group.purpose === "event" && group.event_location && <span><svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>{group.event_location}</span>}
                    {primaryDateMeta && <span>{primaryDateMeta.label}: {primaryDateMeta.value}</span>}
                    {deadlineMeta && <span>{deadlineMeta.label}: {deadlineMeta.value}</span>}
                  </div>
                  <div className="ak-workspace-banner-meta-row">
                    <span>{purposeLabel}</span>
                    <span>{categoryLabel}</span>
                    {target !== null && <span>Target: {money(target, group.currency_code)}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="ak-workspace-hero-actions"><GroupWorkspaceActions groupId={group.id} groupName={group.name} invitationUrl={groupInvitationUrl} initialNotificationsMuted={groupNotificationsMuted} /></div>
          </section>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <Link className="active" aria-current="page" href={`/workspace/groups/${group.id}`}><DashboardOutlinedIcon />Overview</Link>
            <Link href={`/workspace/groups/${group.id}/finances`}><AccountBalanceWalletOutlinedIcon />Finances</Link>
            <Link href={`/workspace/groups/${group.id}/membership`}><GroupsOutlinedIcon />Membership</Link>
            <Link href={`/workspace/groups/${group.id}/chat`}><ChatBubbleOutlineOutlinedIcon />Chat{chatUnreadCount > 0 && <span className="ak-group-tab-unread-badge">{chatUnreadCount > 99 ? "99+" : chatUnreadCount}</span>}</Link>
            <Link href={`/workspace/groups/${group.id}/settings`}><SettingsOutlinedIcon />Settings</Link>
          </nav>
          {group.status !== "active" && <div className="ak-workspace-card ak-group-deactivated-banner">
            <strong>This group has been deactivated.</strong>
            <p>New invitations, membership changes and financial activity are disabled. Historical group information remains available during the retention period.</p>
            {group.scheduled_delete_at && <small>Scheduled deletion: {formatDate(group.scheduled_delete_at)}</small>}
          </div>}

          <section className="ak-workspace-summary" aria-label="Group summary">
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon members">♧</span><div><small>Active members</small><strong>{membersError ? "—" : members.length + (plan ? " / " + plan.max_members : "")}</strong><span>People in this group, including leadership</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon target">◎</span><div><small>Group target</small><strong>{target === null ? "Not set" : money(target, group.currency_code)}</strong><span>{target === null ? "No target amount set" : "Shared group target"}</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon role">♙</span><div><small>Your role</small><strong>{membership.role === "group_creator" ? "Group Creator" : membership.role === "group_admin" ? "Group Admin" : "Member"}</strong><span>Member since {formatDate(membership.joined_at)}</span></div></article>
          </section>

          {query.membershipError && <p className="ak-finance-error" role="alert">{query.membershipError}</p>}
          {query.membershipUpdated && <p className="ak-workspace-footnote" role="status">Group leadership updated.</p>}
          <section className="ak-workspace-card ak-leadership-status" aria-label="Group leadership readiness">
            <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">GROUP GOVERNANCE</span><h2>Leadership readiness</h2><p>Contributions stay disabled until the Group Creator has appointed the required Group Admins.</p></div><span className="ak-count-pill">{activeGroupAdminCount} / {requiredGroupAdmins} Group Admins</span></div>
            <p>{leadershipReady ? "Leadership is established. Contributions may be enabled subject to payment availability." : "Leadership is not yet established. Add members, then appoint the required Group Admins to unlock contributions."}</p>
          </section>
          <div className="ak-workspace-overview-grid">
            <div className="ak-workspace-primary-column">
              <section className="ak-workspace-card ak-workspace-progress">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">THE SHARED GOAL</span><h2>Contribution progress</h2><p>Keep everyone connected to what the group is working towards.</p></div><Link className="ak-count-pill" href={`/workspace/groups/${group.id}/finances`}>View finances</Link></div>
                <div className="ak-progress-empty"><span>↗</span><div><strong>{target === null ? "Set a shared target when you are ready" : "Your group target is " + money(target, group.currency_code)}</strong><p>View confirmed contributions and make a contribution from the group finances area. Akiba does not hold group funds; payments are processed by the provider.</p><Link href={`/workspace/groups/${group.id}/finances`} className="ak-finance-inline-link">Open group finances →</Link></div></div>
              </section>

              <section className="ak-workspace-card" id="members">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">THE PEOPLE BEHIND THE PLAN</span><h2>Group members</h2><p>People who are part of this shared space.</p></div><span className="ak-count-pill">{membersError ? "—" : members.length + " members"}</span></div>
                {membersError ? <div className="ak-workspace-empty"><strong>Members couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
                  : members.length === 0 ? <div className="ak-workspace-empty"><strong>No members to show yet</strong><p>Active group members will appear here.</p></div>
                  : <div className="ak-workspace-member-list">{members.map((member) => {
                    const name = member.profile?.display_name?.trim() || (member.user_id === user.id ? "You" : "Akiba member");
                    const photo = member.profile?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(member.profile.avatar_path).data.publicUrl : null;
                    return <div className="ak-workspace-member" key={member.user_id}>
                      {photo ? <img src={photo} alt="" /> : <span className="ak-workspace-member-fallback">{initials(name)}</span>}
                      <div><strong>{name}{member.user_id === user.id ? <em>You</em> : null}</strong><small>{member.profile?.username ? "@" + member.profile.username : "Akiba member"}</small></div>
                      <div className="ak-workspace-member-role"><span className={member.role !== "member" ? "admin" : ""}>{member.role === "group_creator" ? "Group Creator" : member.role === "group_admin" ? "Group Admin" : "Member"}</span>
                      {isGroupCreator && member.role !== "group_creator" && <form action={setGroupAdmin}>
                        <input type="hidden" name="group_id" value={group.id} />
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <input type="hidden" name="action" value={member.role === "group_admin" ? "demote" : "appoint"} />
                        <button type="submit" disabled={!plan || (member.role === "member" && activeGroupAdminCount >= plan.max_group_admins)}>{member.role === "group_admin" ? "Demote" : "Appoint"}</button>
                      </form>}</div>
                    </div>;
                  })}</div>}
                {profilesError && !membersError && <p className="ak-workspace-footnote">Some profile details are temporarily unavailable.</p>}
                {isGroupCreator && <p className="ak-workspace-footnote">You may appoint or demote active members as Group Admins. The launch plan allows {plan?.max_group_admins ?? "—"} Group Admins.</p>}
              </section>
            </div>

            <aside className="ak-workspace-side-column">
              <section className="ak-workspace-card ak-workspace-invite"><span className="ak-invite-symbol">＋</span><span className="ak-section-eyebrow">MAKE IT A GROUP EFFORT</span><h2>Bring your people in</h2><p>Invite people, view the membership directory and manage group roles from the Membership area.</p><Link className="ak-membership-open-link" href={`/workspace/groups/${group.id}/membership`}>Open Membership →</Link></section>
              {isGroupCreator && <section className="ak-workspace-card ak-workspace-quick-links" aria-labelledby="group-quick-links-title">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">SHORTCUTS</span><h2 id="group-quick-links-title">Quick links</h2></div></div>
                <Link className="ak-membership-open-link" href={`/workspace/groups/${group.id}/settings`}>
                  <SettingsOutlinedIcon fontSize="small" /> Edit Group <span aria-hidden="true">→</span>
                </Link>
              </section>}
              <section className="ak-workspace-card"><div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">AT A GLANCE</span><h2>About this group</h2></div></div><dl className="ak-workspace-details">
                <div><dt>Group type</dt><dd>{purposeLabel}</dd></div>
                <div><dt>Category</dt><dd>{categoryLabel}</dd></div>
                {group.purpose === "event" && group.event_location && <div><dt>Location</dt><dd>{group.event_location}</dd></div>}
                {group.purpose === "event" && group.event_date && <div><dt>Event date</dt><dd>{formatDate(group.event_date)}</dd></div>}
                {group.deadline && <div><dt>Deadline</dt><dd>{formatDate(group.deadline)}</dd></div>}
                {target !== null && <div><dt>Target amount</dt><dd>{money(target, group.currency_code)}</dd></div>}
                <div><dt>Currency</dt><dd>{group.currency_code}</dd></div><div><dt>Created</dt><dd>{formatDate(group.created_at)}</dd></div>
              </dl></section>
            </aside>
          </div>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
