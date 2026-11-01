import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ groupId: string }> };
type Member = {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profile?: {
    display_name: string | null;
    username: string;
    avatar_path: string | null;
  };
};

function initials(value: string) {
  return value.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group, error: groupError } = await supabase
    .from("akiba_groups")
    .select("id,name,purpose,description,currency_code,created_at")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) notFound();

  const { data: membership } = await supabase
    .from("akiba_group_memberships")
    .select("role,status,joined_at")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") notFound();

  const { data: memberRows, error: membersError } = await supabase
    .from("akiba_group_memberships")
    .select("user_id,role,joined_at")
    .eq("group_id", group.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  let members: Member[] = [];
  let profilesError = false;

  if (!membersError && memberRows?.length) {
    const userIds = memberRows.map((member) => member.user_id);
    const { data: profiles, error } = await supabase
      .from("akiba_profiles")
      .select("user_id,display_name,username,avatar_path")
      .in("user_id", userIds);
    profilesError = Boolean(error);
    const profileByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    members = memberRows.map((member) => ({
      ...member,
      profile: profileByUser.get(member.user_id) ?? undefined,
    }));
  }

  const purposeLabel = group.purpose === "event" ? "Event group" : "Goal group";
  const currentMember = members.find((member) => member.user_id === user.id);
  const avatarUrl = (path: string | null | undefined) =>
    path ? supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl : null;

  return (
    <main className="ak-group-page">
      <header className="ak-group-topbar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <div className="ak-group-topbar-right">
          <Link href="/workspace" className="ak-group-back">← Back to dashboard</Link>
          <span className="ak-group-account">{user.email}</span>
          <form action={signOut}><button className="ak-group-signout" type="submit">Sign out</button></form>
        </div>
      </header>

      <div className="ak-group-content">
        <div className="ak-group-breadcrumb"><Link href="/workspace">My Groups</Link><span>/</span><span>{group.name}</span></div>

        <section className="ak-group-hero">
          <div className="ak-group-hero-copy">
            <span className="ak-group-kicker">{purposeLabel.toUpperCase()}</span>
            <h1>{group.name}</h1>
            <p>{group.description?.trim() || "A shared space for people to come together and make things happen."}</p>
            <div className="ak-group-meta">
              <span><b>◎</b>{group.currency_code} base currency</span>
              <span><b>◷</b>Created {formatDate(group.created_at)}</span>
            </div>
          </div>
          <div className="ak-group-hero-mark" aria-hidden="true">{group.purpose === "event" ? "▦" : "◎"}</div>
        </section>

        <section className="ak-group-overview-grid" aria-label="Group overview">
          <article className="ak-group-stat">
            <span className="ak-group-stat-icon pink">♧</span>
            <div><small>Active members</small><strong>{membersError ? "—" : members.length}</strong></div>
          </article>
          <article className="ak-group-stat">
            <span className="ak-group-stat-icon violet">♙</span>
            <div><small>Your role</small><strong>{membership.role === "admin" ? "Administrator" : "Member"}</strong></div>
          </article>
          <article className="ak-group-stat">
            <span className="ak-group-stat-icon green">✓</span>
            <div><small>Your membership</small><strong>Active</strong></div>
          </article>
        </section>

        <div className="ak-group-main-grid">
          <section className="ak-group-panel ak-group-members-panel">
            <div className="ak-group-panel-heading">
              <div><h2>Members</h2><p>People who are part of this group.</p></div>
              {!membersError && <span className="ak-group-member-count">{members.length} {members.length === 1 ? "member" : "members"}</span>}
            </div>

            {membersError ? (
              <div className="ak-group-state ak-group-state-error" role="alert">
                <span>!</span><div><strong>Members couldn&apos;t be loaded</strong><p>Please refresh the page to try again.</p><a href={"/workspace/groups/" + group.id}>Try again</a></div>
              </div>
            ) : members.length === 0 ? (
              <div className="ak-group-state"><span>♧</span><strong>No members to show yet</strong><p>Active group members will appear here.</p></div>
            ) : (
              <div className="ak-group-member-list">
                {members.map((member) => {
                  const name = member.profile?.display_name?.trim() || (member.user_id === user.id ? "You" : "Akiba member");
                  const photo = avatarUrl(member.profile?.avatar_path);
                  return (
                    <article className="ak-group-member" key={member.user_id}>
                      {photo ? <img className="ak-group-member-avatar" src={photo} alt="" /> : <span className="ak-group-member-avatar ak-group-member-fallback">{initials(name)}</span>}
                      <div className="ak-group-member-copy"><strong>{name}{member.user_id === user.id ? <em>You</em> : null}</strong><small>{member.profile?.username ? "@" + member.profile.username : "Akiba member"}</small></div>
                      <span className={"ak-group-role " + (member.role === "admin" ? "admin" : "")}>{member.role === "admin" ? "Admin" : "Member"}</span>
                    </article>
                  );
                })}
              </div>
            )}
            {profilesError && !membersError && <p className="ak-group-subtle-note">Some profile details are temporarily unavailable.</p>}
          </section>

          <aside className="ak-group-side-column">
            <section className="ak-group-panel">
              <div className="ak-group-panel-heading"><div><h2>About this group</h2><p>Group details at a glance.</p></div></div>
              <dl className="ak-group-details">
                <div><dt>Purpose</dt><dd>{group.purpose === "event" ? "Event" : "Goal"}</dd></div>
                <div><dt>Base currency</dt><dd>{group.currency_code}</dd></div>
                <div><dt>You joined</dt><dd>{formatDate(membership.joined_at)}</dd></div>
                <div><dt>Group created</dt><dd>{formatDate(group.created_at)}</dd></div>
              </dl>
            </section>
            <section className="ak-group-note">
              <span>✳</span><strong>Do more, together</strong>
              <p>Good things happen when people come together around a shared purpose.</p>
            </section>
          </aside>
        </div>
        <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
      </div>
    </main>
  );
}
