import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { acceptGroupInvitationById, declineGroupInvitationById } from "@/app/workspace/actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell from "@/app/workspace/notification-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };
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

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

export default async function InvitationsInboxPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/workspace/invitations"));
  const [{ data: profile }, { data: invitationRows, error }] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("akiba_list_my_group_invitations"),
  ]);
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/invitations"));
  const invitations = (invitationRows ?? []) as Invitation[];
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <NotificationRealtime />
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link active"><span>✉</span>Invitations{invitations.length > 0 ? <small className="ak-coming">{invitations.length}</small> : null}</Link>
          <NotificationSidebarLink />
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
          <div className="ak-workspace-top-crumb"><Link href="/workspace">Workspace</Link><span>/</span><strong>Invitations</strong></div>
          <div className="ak-topbar-right"><NotificationBell /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>
        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-page-heading"><div><span className="ak-section-eyebrow">YOUR INVITATIONS</span><h1>Group invitations</h1><p>Invitations addressed to your Akiba account or email.</p></div><Link className="ak-workspace-back" href="/workspace">← Back to workspace</Link></div>
          {params.error && <p className="ak-finance-error" role="alert">{params.error}</p>}
          {params.message && <p className="ak-workspace-footnote" role="status">{params.message}</p>}
          <section className="ak-workspace-card">
            <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">PENDING</span><h2>Invitations waiting for you</h2><p>Accept to join as a regular Member, or decline to end the invitation.</p></div><span className="ak-count-pill">{invitations.length}</span></div>
            {error ? <div className="ak-workspace-empty"><strong>Invitations couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
              : invitations.length === 0 ? <div className="ak-workspace-empty"><strong>No pending invitations</strong><p>When someone invites you to a group, it will appear here.</p></div>
                : <div className="ak-workspace-member-list">{invitations.map((invite) => (
                  <article className="ak-workspace-member ak-inbox-invitation" key={invite.invitation_id}>
                    <span className="ak-workspace-member-fallback">♧</span>
                    <div><strong>{invite.group_name}</strong><small>Invited by {invite.inviter_display_name || (invite.inviter_username ? "@" + invite.inviter_username : "A group member")}</small>
                      {invite.group_description ? <p>{invite.group_description}</p> : null}
                      <small>Expires {new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(invite.expires_at))}</small>
                    </div>
                    <div className="ak-inbox-actions">
                      <form action={acceptGroupInvitationById}><input type="hidden" name="invitation_id" value={invite.invitation_id} /><button type="submit" className="workspace-primary">Accept</button></form>
                      <form action={declineGroupInvitationById}><input type="hidden" name="invitation_id" value={invite.invitation_id} /><button type="submit" className="ak-member-danger">Decline</button></form>
                    </div>
                  </article>
                ))}</div>}
          </section>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
