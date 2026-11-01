import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import GroupWorkspaceActions from "./group-workspace-actions";

type Props = { params: Promise<{ groupId: string }> };
type Member = {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profile?: { display_name: string | null; username: string; avatar_path: string | null };
};

const frequencyLabels: Record<string, string> = {
  one_time: "One-time", weekly: "Weekly", biweekly: "Every two weeks",
  monthly: "Monthly", quarterly: "Quarterly", annually: "Annually",
};
const groupTypeLabels: Record<string, string> = {
  birthday: "Birthday", wedding: "Wedding", graduation: "Graduation",
  funeral_bereavement: "Funeral & Bereavement", party_celebration: "Party & Celebration",
  trip_vacation: "Trip & Vacation", community_event: "Community Event", fundraiser: "Fundraiser",
  other_event: "Other Event", rent_housing: "Rent & Housing", education: "Education",
  business_investment: "Business & Investment", land_property: "Land & Property",
  vehicle_purchase: "Vehicle Purchase", family_support: "Family Support",
  shared_savings: "Shared Savings", community_project: "Community Project",
  other_goal: "Other Goal", rotating_savings: "Rotating Savings", table_banking: "Table Banking",
  accumulating_savings: "Accumulating Savings", investment_chama: "Investment Chama", other_chama: "Other Chama",
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

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
    supabase.from("akiba_groups").select("id,name,purpose,group_type,description,currency_code,target_amount,event_date,deadline,contribution_frequency,group_image_path,created_at").eq("id", groupId).maybeSingle(),
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
  ]);
  if (groupError || !group) notFound();
  if (!profile?.display_name?.trim()) redirect("/onboarding");

  const { data: membership } = await supabase.from("akiba_group_memberships")
    .select("role,status,joined_at").eq("group_id", group.id).eq("user_id", user.id).maybeSingle();
  if (!membership || membership.status !== "active") notFound();

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

  const purpose = group.purpose === "event" ? "Event" : group.purpose === "chama" ? "Chama" : "Goal";
  const typeLabel = groupTypeLabels[group.group_type] ?? "Group";
  const groupImageUrl = group.group_image_path ? supabase.storage.from("group-images").getPublicUrl(group.group_image_path).data.publicUrl : null;
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const target = group.target_amount === null ? null : Number(group.target_amount);
  const firstName = profile.display_name.trim().split(/\\s+/)[0];
  const dateMeta = group.event_date
    ? { label: "Event date", value: formatDate(group.event_date) }
    : group.deadline ? { label: "Deadline", value: formatDate(group.deadline) } : null;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace#your-groups" className="ak-nav-link active"><span>♧</span>My Groups</Link>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>◷</span>Chat<small className="ak-coming">Soon</small></span>
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
          <div className="ak-workspace-top-crumb"><Link href="/workspace">My Groups</Link><span>/</span><strong>{group.name}</strong></div>
          <div className="ak-topbar-right"><span className="ak-topbar-greeting">Your space, together</span><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-toolbar">
            <Link href="/workspace" className="ak-workspace-back">← All groups</Link>
            <GroupWorkspaceActions groupName={group.name} />
          </div>

          <section className="ak-workspace-banner">
            <div className="ak-workspace-banner-image" aria-hidden="true" />
            <div className="ak-workspace-banner-shade" />
            <div className="ak-workspace-banner-copy">
              <span className="ak-workspace-overline">{purpose} · {typeLabel}</span>
              <h1>{group.name}</h1>
              <p>{group.description?.trim() || "A shared space for people to come together and make things happen."}</p>
              <div className="ak-workspace-banner-meta">
                <span>{group.currency_code} base currency</span>
                {dateMeta && <span>{dateMeta.label}: {dateMeta.value}</span>}
                {group.contribution_frequency && <span>{frequencyLabels[String(group.contribution_frequency)] ?? String(group.contribution_frequency)} contributions</span>}
              </div>
            </div>
            <div className="ak-workspace-group-image">
              {groupImageUrl ? <img src={groupImageUrl} alt={group.name + " group"} /> : <span>{initials(group.name)}</span>}
            </div>
          </section>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <span className="active" aria-current="page">Overview</span>
            <span aria-disabled="true" title="Financial tools are being developed">Finances</span>
            <span aria-disabled="true" title="Member management improvements are coming soon">Members</span>
            <span aria-disabled="true" title="Group chat is coming soon">Chat</span>
            <span aria-disabled="true" title="Group settings are coming soon">Settings</span>
          </nav>

          <section className="ak-workspace-summary" aria-label="Group summary">
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon members">♧</span><div><small>Active members</small><strong>{membersError ? "—" : members.length}</strong><span>{members.length === 1 ? "You are the first member" : "People in this group"}</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon target">◎</span><div><small>Group target</small><strong>{target === null ? "Not set" : money(target, group.currency_code)}</strong><span>{target === null ? "No target amount set" : "Shared group target"}</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon role">♙</span><div><small>Your role</small><strong>{membership.role === "admin" ? "Administrator" : "Member"}</strong><span>Member since {formatDate(membership.joined_at)}</span></div></article>
          </section>

          <div className="ak-workspace-overview-grid">
            <div className="ak-workspace-primary-column">
              <section className="ak-workspace-card ak-workspace-progress">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">THE SHARED GOAL</span><h2>Contribution progress</h2><p>Keep everyone connected to what the group is working towards.</p></div><span className="ak-coming-pill">Coming soon</span></div>
                <div className="ak-progress-empty"><span>↗</span><div><strong>{target === null ? "Set a shared target when you are ready" : "Your group target is " + money(target, group.currency_code)}</strong><p>Contribution tracking will appear here when the group finance tools are introduced. Akiba does not currently hold or move group funds.</p></div></div>
              </section>

              <section className="ak-workspace-card">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">THE PEOPLE BEHIND THE PLAN</span><h2>Group members</h2><p>People who are part of this shared space.</p></div><span className="ak-count-pill">{membersError ? "—" : members.length + " members"}</span></div>
                {membersError ? <div className="ak-workspace-empty"><strong>Members couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
                  : members.length === 0 ? <div className="ak-workspace-empty"><strong>No members to show yet</strong><p>Active group members will appear here.</p></div>
                  : <div className="ak-workspace-member-list">{members.slice(0, 5).map((member) => {
                    const name = member.profile?.display_name?.trim() || (member.user_id === user.id ? "You" : "Akiba member");
                    const photo = member.profile?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(member.profile.avatar_path).data.publicUrl : null;
                    return <div className="ak-workspace-member" key={member.user_id}>
                      {photo ? <img src={photo} alt="" /> : <span className="ak-workspace-member-fallback">{initials(name)}</span>}
                      <div><strong>{name}{member.user_id === user.id ? <em>You</em> : null}</strong><small>{member.profile?.username ? "@" + member.profile.username : "Akiba member"}</small></div>
                      <span className={member.role === "admin" ? "admin" : ""}>{member.role === "admin" ? "Administrator" : "Member"}</span>
                    </div>;
                  })}</div>}
                {profilesError && !membersError && <p className="ak-workspace-footnote">Some profile details are temporarily unavailable.</p>}
              </section>
            </div>

            <aside className="ak-workspace-side-column">
              <section className="ak-workspace-card ak-workspace-invite"><span className="ak-invite-symbol">＋</span><span className="ak-section-eyebrow">MAKE IT A GROUP EFFORT</span><h2>Bring your people in</h2><p>Great things happen when everyone who matters can take part. Invitations are part of the next workspace milestone.</p><button type="button" disabled>Invitations coming soon</button></section>
              <section className="ak-workspace-card"><div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">AT A GLANCE</span><h2>About this group</h2></div></div><dl className="ak-workspace-details">
                <div><dt>Category</dt><dd>{purpose}</dd></div><div><dt>Group type</dt><dd>{typeLabel}</dd></div>
                {group.event_date && <div><dt>Event date</dt><dd>{formatDate(group.event_date)}</dd></div>}
                {group.deadline && <div><dt>Deadline</dt><dd>{formatDate(group.deadline)}</dd></div>}
                {group.contribution_frequency && <div><dt>Frequency</dt><dd>{frequencyLabels[String(group.contribution_frequency)] ?? String(group.contribution_frequency)}</dd></div>}
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
