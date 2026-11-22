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

  const [
    { data: financeTransactions, error: financeTransactionsError },
    { data: contributionTransactions, error: contributionTransactionsError },
    { data: financeLedgerLines, error: financeLedgerError },
    { data: activeReservations, error: reservationsError },
    { data: financeEvents, error: financeEventsError },
    { data: recentMessages, error: recentMessagesError },
  ] = await Promise.all([
    supabase.from("akiba_financial_transactions")
      .select("id,description,currency_code,effective_at,created_by,transaction_type")
      .eq("group_id", group.id)
      .order("effective_at", { ascending: false })
      .limit(8),
    supabase.from("akiba_financial_transactions")
      .select("id")
      .eq("group_id", group.id)
      .eq("transaction_type", "contribution"),
    supabase.from("akiba_financial_ledger_entries")
      .select("transaction_id,amount_minor,direction,account_code")
      .eq("group_id", group.id)
      .eq("account_code", "group_funds"),
    supabase.from("akiba_financial_reservations")
      .select("amount_minor")
      .eq("group_id", group.id)
      .eq("status", "active"),
    supabase.from("akiba_finance_activity_events")
      .select("id,event_type,actor_id,event_payload,created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("akiba_group_messages")
      .select("id,author_id,body,created_at")
      .eq("group_id", group.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const target = group.target_amount === null ? null : Number(group.target_amount);
  const financeReadError = Boolean(
    financeTransactionsError || contributionTransactionsError || financeLedgerError || reservationsError || financeEventsError
  );
  const contributionTransactionIds = new Set(
    (contributionTransactions ?? []).map((transaction) => transaction.id)
  );
  const contributionTotalMinor = (financeLedgerLines ?? [])
    .filter((line) => contributionTransactionIds.has(line.transaction_id) && line.direction === "credit")
    .reduce((sum, line) => sum + Number(line.amount_minor), 0);
  const groupLedgerBalanceMinor = (financeLedgerLines ?? [])
    .reduce((sum, line) => sum + (line.direction === "credit" ? Number(line.amount_minor) : -Number(line.amount_minor)), 0);
  const reservedMinor = (activeReservations ?? [])
    .reduce((sum, reservation) => sum + Number(reservation.amount_minor), 0);
  const availableBalanceMinor = groupLedgerBalanceMinor - reservedMinor;
  const progressPercent = target === null || target <= 0
    ? null
    : Math.min(100, Math.round((Math.max(0, availableBalanceMinor) / (target * 100)) * 100));
  const progressWidth = progressPercent === null ? 0 : Math.max(0, Math.min(100, progressPercent));

  const activityActorIds = Array.from(new Set([
    ...(financeTransactions ?? []).map((item) => item.created_by),
    ...(financeEvents ?? []).map((item) => item.actor_id),
    ...(recentMessages ?? []).map((item) => item.author_id),
  ].filter((id): id is string => typeof id === "string")));
  const { data: activityProfiles } = activityActorIds.length
    ? await supabase.from("akiba_profiles").select("user_id,display_name,username").in("user_id", activityActorIds)
    : { data: [] };
  const activityNameById = new Map((activityProfiles ?? []).map((item) => [
    item.user_id,
    item.display_name?.trim() || item.username || "Group member",
  ]));
  const recentFinanceActivity = [
    ...(financeTransactions ?? []).filter((item) =>
      (financeLedgerLines ?? []).some((line) => line.transaction_id === item.id)
    ).map((item) => ({
      id: "transaction:" + item.id,
      occurredAt: item.effective_at,
      title: item.transaction_type === "contribution" ? "Contribution recorded" : item.transaction_type === "withdrawal" ? "Withdrawal recorded" : String(item.transaction_type).replace(/_/g, " "),
      detail: item.description?.trim() || "A financial transaction was posted to the group ledger.",
      actor: item.created_by ? activityNameById.get(item.created_by) ?? "Group member" : "Akiba system",
    })),
    ...(financeEvents ?? []).map((item) => ({
      id: "event:" + item.id,
      occurredAt: item.created_at,
      title: String(item.event_type).replace(/_/g, " "),
      detail: item.actor_id ? "Action recorded by " + (activityNameById.get(item.actor_id) ?? "a group member") + "." : "System workflow update.",
      actor: item.actor_id ? activityNameById.get(item.actor_id) ?? "Group member" : "Akiba system",
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 5);

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
            <div className="ak-workspace-hero-actions"><GroupWorkspaceActions groupId={group.id} groupName={group.name} invitationUrl={groupInvitationUrl} initialNotificationsMuted={groupNotificationsMuted} isGroupCreator={isGroupCreator} /></div>
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
                {financeReadError ? (
                  <div className="ak-workspace-empty" role="status"><strong>Financial summary is temporarily unavailable</strong><p>Open Group Finances for the full ledger and try again later. No figures are estimated.</p></div>
                ) : (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12, marginTop: 18 }}>
                      <div><small style={{ display: "block", color: "#858ba2", fontSize: 10 }}>Confirmed contributions</small><strong style={{ display: "block", color: "#333653", fontSize: 20, marginTop: 5 }}>{money(contributionTotalMinor / 100, group.currency_code)}</strong></div>
                      <div><small style={{ display: "block", color: "#858ba2", fontSize: 10 }}>Available balance</small><strong style={{ display: "block", color: "#176b50", fontSize: 20, marginTop: 5 }}>{money(availableBalanceMinor / 100, group.currency_code)}</strong></div>
                      <div><small style={{ display: "block", color: "#858ba2", fontSize: 10 }}>Reserved for withdrawals</small><strong style={{ display: "block", color: "#333653", fontSize: 20, marginTop: 5 }}>{money(reservedMinor / 100, group.currency_code)}</strong></div>
                    </div>
                    {target !== null && target > 0 ? (
                      <div style={{ marginTop: 22 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 8 }}>
                          <strong style={{ color: "#333653", fontSize: 12 }}>Available towards target</strong>
                          <strong style={{ color: "#176b50", fontSize: 13 }}>{progressPercent}%</strong>
                        </div>
                        <div role="progressbar" aria-label="Available balance towards group target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, progressPercent ?? 0)} style={{ height: 9, background: "#edf1ee", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: progressWidth + "%", height: "100%", background: "#176b50", borderRadius: 99, transition: "width 250ms ease" }} />
                        </div>
                        <p style={{ margin: "8px 0 0", color: "#858ba2", fontSize: 10 }}>{money(availableBalanceMinor / 100, group.currency_code)} available of {money(target, group.currency_code)} target. Reserved funds are excluded.</p>
                      </div>
                    ) : (
                      <p className="ak-workspace-footnote">Set a target in Group Settings to track progress. Confirmed contributions and balances remain visible here.</p>
                    )}
                    <p className="ak-workspace-footnote">Akiba records group financial activity but does not hold group funds. Payment partners process transfers.</p>
                    <Link href={`/workspace/groups/${group.id}/finances`} className="ak-finance-inline-link">Open group finances →</Link>
                  </div>
                )}
              </section>

              <section className="ak-workspace-card">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">WHAT'S HAPPENING</span><h2>Recent group activity</h2><p>Recent financial records and workflow updates.</p></div><Link className="ak-count-pill" href={`/workspace/groups/${group.id}/finances`}>View finances</Link></div>
                {financeReadError ? <div className="ak-workspace-empty"><strong>Activity is temporarily unavailable</strong><p>Refresh the page or open Group Finances to review the ledger.</p></div>
                  : recentFinanceActivity.length === 0 ? <div className="ak-workspace-empty"><strong>No financial activity yet</strong><p>Confirmed contributions and group finance workflow events will appear here.</p></div>
                  : <div className="ak-workspace-details">
                    {recentFinanceActivity.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid #edf0ed" }}>
                      <div><strong style={{ display: "block", color: "#333653", fontSize: 11, textTransform: "capitalize" }}>{item.title}</strong><span style={{ display: "block", color: "#858ba2", fontSize: 10, marginTop: 4 }}>{item.detail}</span><small style={{ display: "block", color: "#9a9fb0", fontSize: 9, marginTop: 4 }}>{item.actor}</small></div>
                      <time dateTime={item.occurredAt} style={{ color: "#858ba2", fontSize: 9, whiteSpace: "nowrap" }}>{formatDate(item.occurredAt)}</time>
                    </div>)}
                  </div>}
              </section>

              <section className="ak-workspace-card">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">GROUP CONVERSATION</span><h2>Recent messages</h2><p>A quick look at the latest conversation in this group.</p></div><Link className="ak-count-pill" href={`/workspace/groups/${group.id}/chat`}>Open chat</Link></div>
                {recentMessagesError ? <div className="ak-workspace-empty"><strong>Recent messages are unavailable</strong><p>Open Group Chat to continue the conversation.</p></div>
                  : !recentMessages?.length ? <div className="ak-workspace-empty"><strong>No messages yet</strong><p>Start the conversation with your group.</p></div>
                  : <div className="ak-workspace-details">
                    {recentMessages.map((message) => {
                      const body = message.body === "[attachment]" ? "Shared an attachment" : message.body;
                      return <div key={message.id} style={{ padding: "12px 0", borderBottom: "1px solid #edf0ed" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong style={{ color: "#333653", fontSize: 11 }}>{activityNameById.get(message.author_id) ?? "Group member"}</strong>
                          <time dateTime={message.created_at} style={{ color: "#858ba2", fontSize: 9, whiteSpace: "nowrap" }}>{formatDate(message.created_at)}</time>
                        </div>
                        <p style={{ margin: "5px 0 0", color: "#68766f", fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" }}>{body.length > 180 ? body.slice(0, 177) + "…" : body}</p>
                      </div>;
                    })}
                  </div>}
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
