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
  other_goal: "Other Goal", rotating_savings: "Rotating Savings (Merry-Go-Round)",
  table_banking: "Table Banking", accumulating_savings: "Accumulating Savings",
  investment_chama: "Investment Chama", other_chama: "Other Chama",
};

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group, error: groupError } = await supabase
    .from("akiba_groups")
    .select("id,name,purpose,group_type,description,currency_code,target_amount,event_date,deadline,contribution_frequency,group_image_path,created_at")
    .eq("id", groupId).maybeSingle();
  if (groupError || !group) notFound();

  const { data: membership } = await supabase
    .from("akiba_group_memberships").select("role,status,joined_at")
    .eq("group_id", group.id).eq("user_id", user.id).maybeSingle();
  if (!membership || membership.status !== "active") notFound();

  const { data: memberRows, error: membersError } = await supabase
    .from("akiba_group_memberships").select("user_id,role,joined_at")
    .eq("group_id", group.id).eq("status", "active").order("joined_at", { ascending: true });

  let members: Member[] = [];
  let profilesError = false;
  if (!membersError && memberRows?.length) {
    const ids = memberRows.map((member) => member.user_id);
    const { data: profiles, error } = await supabase.from("akiba_profiles")
      .select("user_id,display_name,username,avatar_path").in("user_id", ids);
    profilesError = Boolean(error);
    const byId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    members = memberRows.map((member) => ({ ...member, profile: byId.get(member.user_id) ?? undefined }));
  }

  const purpose = group.purpose === "event" ? "Event" : group.purpose === "chama" ? "Chama" : "Goal";
  const typeLabel = groupTypeLabels[group.group_type] ?? "Group";
  const groupImageUrl = group.group_image_path
    ? supabase.storage.from("group-images").getPublicUrl(group.group_image_path).data.publicUrl : null;
  const avatarUrl = (path: string | null | undefined) =>
    path ? supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl : null;
  const currentMember = members.find((member) => member.user_id === user.id);
  const target = group.target_amount === null ? null : Number(group.target_amount);
  const dateMeta = group.event_date
    ? { label: "Event date", value: formatDate(group.event_date) }
    : group.deadline ? { label: "Deadline", value: formatDate(group.deadline) } : null;

  return (
    <main className="ak-group-page ak-group-workspace">
      <header className="ak-group-topbar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <div className="ak-group-topbar-right">
          <Link href="/workspace" className="ak-group-back">← Dashboard</Link>
          <span className="ak-group-account">{user.email}</span>
          <form action={signOut}><button className="ak-group-signout" type="submit">Sign out</button></form>
        </div>
      </header>

      <div className="ak-group-content">
        <div className="ak-group-breadcrumb"><Link href="/workspace">My Groups</Link><span>/</span><span>{group.name}</span></div>

        <section className="ak-workspace-hero">
          <div className="ak-workspace-cover" aria-hidden="true" />
          <div className="ak-workspace-identity">
            {groupImageUrl
              ? <img className="ak-workspace-avatar" src={groupImageUrl} alt="" />
              : <div className="ak-workspace-avatar ak-workspace-avatar-fallback">{initials(group.name)}</div>}
            <div className="ak-workspace-title">
              <div className="ak-workspace-kickers"><span>{purpose} group</span><span>{typeLabel}</span></div>
              <h1>{group.name}</h1>
              <p>{group.description?.trim() || "A shared space for people to come together and make things happen."}</p>
              <div className="ak-workspace-meta">
                <span>{group.currency_code} base currency</span>
                {dateMeta && <span>{dateMeta.label}: {dateMeta.value}</span>}
                {group.contribution_frequency && <span>{frequencyLabels[String(group.contribution_frequency)] ?? String(group.contribution_frequency)} contributions</span>}
              </div>
            </div>
          </div>
          <div className="ak-workspace-actions"><GroupWorkspaceActions groupName={group.name} /></div>
        </section>

        <nav className="ak-group-tabs" aria-label="Group workspace">
          <span className="active" aria-current="page">Overview</span>
          <span aria-disabled="true" title="Finances will be introduced in a later milestone">Finances <small>Coming soon</small></span>
          <span aria-disabled="true" title="Member management improvements are coming soon">Members</span>
          <span aria-disabled="true" title="Group chat is coming soon">Chat <small>Coming soon</small></span>
          <span aria-disabled="true" title="Group settings are coming soon">Settings</span>
        </nav>

        <section className="ak-workspace-summary" aria-label="Group summary">
          <article className="ak-workspace-summary-card">
            <span className="ak-summary-icon members">♧</span><div><small>Active members</small><strong>{membersError ? "—" : members.length}</strong><span>{members.length === 1 ? "You are the first member" : "People in this group"}</span></div>
          </article>
          <article className="ak-workspace-summary-card">
            <span className="ak-summary-icon target">◎</span><div><small>Group target</small><strong>{target === null ? "Not set" : money(target, group.currency_code)}</strong><span>{target === null ? "This group has no target amount" : "Target in " + group.currency_code}</span></div>
          </article>
          <article className="ak-workspace-summary-card">
            <span className="ak-summary-icon role">♙</span><div><small>Your role</small><strong>{membership.role === "admin" ? "Administrator" : "Member"}</strong><span>Active member since {formatDate(membership.joined_at)}</span></div>
          </article>
        </section>

        <div className="ak-workspace-overview-grid">
          <div className="ak-workspace-primary-column">
            <section className="ak-workspace-card ak-workspace-progress">
              <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">GROUP FINANCES</span><h2>Contribution progress</h2><p>See how your group is moving towards its shared target.</p></div><span className="ak-coming-pill">In development</span></div>
              {target === null ? (
                <div className="ak-progress-empty"><span>◎</span><div><strong>No target amount set</strong><p>You can still organise this group without a fundraising target.</p></div></div>
              ) : (
                <div className="ak-progress-empty"><span>↗</span><div><strong>Contribution tracking is being prepared</strong><p>Your target is {money(target, group.currency_code)}. Recorded contributions and progress will appear here when group finances are introduced.</p></div></div>
              )}
            </section>

            <section className="ak-workspace-card">
              <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">YOUR PEOPLE</span><h2>Members</h2><p>People who are part of this group.</p></div><span className="ak-count-pill">{membersError ? "—" : members.length + " members"}</span></div>
              {membersError ? <div className="ak-workspace-empty"><strong>Members couldn&apos;t be loaded</strong><p>Please refresh the page to try again.</p></div>
                : members.length === 0 ? <div className="ak-workspace-empty"><strong>No members to show yet</strong><p>Active group members will appear here.</p></div>
                : <div className="ak-workspace-member-list">{members.slice(0, 5).map((member) => {
                  const name = member.profile?.display_name?.trim() || (member.user_id === user.id ? "You" : "Akiba member");
                  const photo = avatarUrl(member.profile?.avatar_path);
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
            <section className="ak-workspace-card ak-workspace-invite">
              <span className="ak-invite-symbol">＋</span><span className="ak-section-eyebrow">GROW TOGETHER</span><h2>Bring your people in</h2>
              <p>Great things happen when everyone who matters can take part. Group invitations are coming in the next milestone.</p>
              <button type="button" disabled>Invitations coming soon</button>
            </section>
            <section className="ak-workspace-card">
              <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">GROUP PROFILE</span><h2>About this group</h2></div></div>
              <dl className="ak-workspace-details">
                <div><dt>Category</dt><dd>{purpose}</dd></div><div><dt>Group type</dt><dd>{typeLabel}</dd></div>
                {group.event_date && <div><dt>Event date</dt><dd>{formatDate(group.event_date)}</dd></div>}
                {group.deadline && <div><dt>Deadline</dt><dd>{formatDate(group.deadline)}</dd></div>}
                {group.contribution_frequency && <div><dt>Frequency</dt><dd>{frequencyLabels[String(group.contribution_frequency)] ?? String(group.contribution_frequency)}</dd></div>}
                <div><dt>Base currency</dt><dd>{group.currency_code}</dd></div><div><dt>Created</dt><dd>{formatDate(group.created_at)}</dd></div>
              </dl>
            </section>
          </aside>
        </div>
        <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
      </div>
    </main>
  );
}
