import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell, { type NotificationBellItem } from "@/app/workspace/notification-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";

type Notification = NotificationBellItem & { group_id: string };

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

function dateHeading(value: string, now: Date) {
  const date = new Date(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (itemDay.getTime() === today.getTime()) return "Today";
  if (itemDay.getTime() === yesterday.getTime()) return "Yesterday";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

type Props = { searchParams: Promise<{ page?: string; error?: string }> };

export default async function NotificationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const pageSize = 50;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/notifications"));

  const from = (page - 1) * pageSize;
  const [{ data: profile }, { data: notifications, error, count }, { data: preview }, { data: unreadCountData }] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_group_notifications")
      .select("id,group_id,event_type,title,body,href,read_at,created_at", { count: "exact" })
      .neq("event_type", "chat_message")
      .order("created_at", { ascending: false }).range(from, from + pageSize - 1),
    supabase.rpc("akiba_list_my_group_notifications", { p_limit: 5 }),
    supabase.rpc("akiba_count_my_unread_group_notifications"),
  ]);

  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/notifications"));

  const rows = (notifications ?? []) as Notification[];
  const unreadCount = Number(unreadCountData ?? 0);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const grouped = new Map<string, Notification[]>();
  const now = new Date();
  for (const item of rows) {
    const heading = dateHeading(item.created_at, now);
    grouped.set(heading, [...(grouped.get(heading) ?? []), item]);
  }
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
          <Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <NotificationSidebarLink active />
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
          <div className="ak-topbar-right"><NotificationBell unreadCount={unreadCount} notifications={(preview ?? []) as Notification[]} /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>
        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-page-heading"><div><span className="ak-section-eyebrow">YOUR UPDATES</span><h1>Notifications</h1><p>Everything happening across your groups, in chronological order.</p></div><Link className="ak-workspace-back" href="/workspace">← Back to workspace</Link></div>
          {params.error ? <p className="ak-finance-error" role="alert">{params.error}</p> : null}
          <section className="ak-workspace-card">
            <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">INBOX</span><h2>All notifications</h2><p>{total} notifications · Page {page} of {totalPages}</p></div><span className="ak-count-pill">{unreadCount} unread</span></div>
            {error ? <div className="ak-workspace-empty" role="alert"><strong>Notifications couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
              : rows.length === 0 ? <div className="ak-workspace-empty"><strong>You’re all caught up</strong><p>Invitations, membership changes and other group activity will appear here.</p></div>
                : <div className="ak-notification-date-groups">{Array.from(grouped.entries()).map(([heading, items]) => (
                  <section className="ak-notification-date-group" key={heading}>
                    <h3>{heading}</h3>
                    <div className="ak-notification-list">{items.map((item) => (
                      <article className={"ak-notification-row" + (item.read_at ? "" : " is-unread")} key={item.id}>
                        <span className="ak-notification-mark" aria-hidden="true">{item.event_type === "chat_message" ? "▣" : item.event_type.startsWith("invitation") ? "✉" : "♧"}</span>
                        <div className="ak-notification-copy">
                          <Link href={item.href}><strong>{item.title}</strong></Link>
                          <p>{item.body}</p>
                          <small>{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(item.created_at))}</small>
                        </div>
                        {item.read_at ? <span className="ak-notification-read">Read</span> : <span className="ak-notification-unread-label">New</span>}
                      </article>
                    ))}</div>
                  </section>
                ))}</div>}
            {totalPages > 1 && <nav className="ak-notification-pagination" aria-label="Notification pages">
              {page > 1 ? <Link href={"/workspace/notifications?page=" + (page - 1)}>← Newer</Link> : <span />}
              <span>Page {page} of {totalPages}</span>
              {page < totalPages ? <Link href={"/workspace/notifications?page=" + (page + 1)}>Older →</Link> : <span />}
            </nav>}
          </section>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
