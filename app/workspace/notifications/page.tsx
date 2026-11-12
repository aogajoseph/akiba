import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { markGroupNotificationRead } from "@/app/workspace/actions";
import { createClient } from "@/lib/supabase/server";

type Notification = {
  id: string;
  group_id: string;
  event_type: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

function initials(value: string) {
  return value.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/notifications"));

  const rpc = supabase.rpc as unknown as (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: Notification[] | null; error: { message: string } | null }>;

  const [{ data: profile }, { data: notifications, error }] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
    rpc("akiba_list_my_group_notifications", { p_limit: 100 }),
  ]);

  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/notifications"));

  const rows = notifications ?? [];
  const unreadCount = rows.filter((item) => !item.read_at).length;
  const avatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace#your-groups" className="ak-nav-link"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <Link href="/workspace/notifications" className="ak-nav-link active"><span>♢</span>Notifications{unreadCount > 0 ? <small>{unreadCount}</small> : null}</Link>
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
          <div className="ak-workspace-top-crumb"><Link href="/workspace">Workspace</Link><span>/</span><strong>Notifications</strong></div>
          <div className="ak-topbar-right"><span className="ak-topbar-greeting">Your space, together</span><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>
        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-page-heading"><div><span className="ak-section-eyebrow">YOUR UPDATES</span><h1>Notifications</h1><p>Invitations, membership changes and important group updates.</p></div><Link className="ak-workspace-back" href="/workspace">← Back to workspace</Link></div>
          <section className="ak-workspace-card">
            <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">INBOX</span><h2>Recent notifications</h2><p>{unreadCount} unread · Showing the latest {rows.length}</p></div><span className="ak-count-pill">{unreadCount}</span></div>
            {error ? <div className="ak-workspace-empty" role="alert"><strong>Notifications couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
              : rows.length === 0 ? <div className="ak-workspace-empty"><strong>You’re all caught up</strong><p>New invitations and group membership updates will appear here.</p></div>
                : <div className="ak-notification-list">{rows.map((item) => (
                  <article className={"ak-notification-row" + (item.read_at ? "" : " is-unread")} key={item.id}>
                    <span className="ak-notification-mark" aria-hidden="true">{item.event_type.startsWith("invitation") ? "✉" : "♧"}</span>
                    <div className="ak-notification-copy">
                      <Link href={item.href}><strong>{item.title}</strong></Link>
                      <p>{item.body}</p>
                      <small>{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(item.created_at))}</small>
                    </div>
                    {!item.read_at ? <form action={markGroupNotificationRead}><input type="hidden" name="notification_id" value={item.id} /><button type="submit">Mark as read</button></form> : <span className="ak-notification-read">Read</span>}
                  </article>
                ))}</div>}
          </section>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
