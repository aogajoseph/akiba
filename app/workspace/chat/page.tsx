import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell from "@/app/workspace/notification-bell";
import MessageBell, { type UnreadGroupSummary } from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";

function initials(value: string) { return value.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A"; }
function dateHeading(value: string, now: Date) {
  const date = new Date(value); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/chat"));
  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("akiba_list_my_group_chat_unread_summaries"),
  ]);
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/chat"));
  const rows = (data ?? []) as UnreadGroupSummary[];
  const grouped = new Map<string, UnreadGroupSummary[]>();
  const now = new Date();
  for (const item of rows) { const heading = dateHeading(item.latest_unread_at, now); grouped.set(heading, [...(grouped.get(heading) ?? []), item]); }
  const total = rows.reduce((sum, item) => sum + Number(item.unread_count), 0);
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  return <main className="ak-dashboard ak-workspace-app"><NotificationRealtime />
    <aside className="ak-sidebar"><Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
      <nav className="ak-nav" aria-label="Main navigation"><span className="ak-nav-label">WORKSPACE</span><Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link><Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups</Link><Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link><NotificationSidebarLink /><MessagesSidebarLink active /><span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span><Link href="/workspace/profile" className="ak-nav-link"><span>♙</span>Edit Profile</Link><Link href="/workspace/account-settings" className="ak-nav-link"><span>⚙</span>Account Settings</Link></nav>
      <div className="ak-sidebar-bottom"><div className="ak-sidebar-promo"><span className="ak-promo-mark">✳</span><strong>Do more, together</strong><p>Bring people together around the things that matter.</p><Link href="/workspace/new">Create a group <span>→</span></Link></div><div className="ak-sidebar-user">{avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{initials(profile.display_name)}</span>}<span className="ak-sidebar-user-copy"><strong>{profile.display_name}</strong><small>@{profile.username}</small></span><form action={signOut}><button type="submit" aria-label="Sign out" title="Sign out">↗</button></form></div></div>
    </aside>
    <section className="ak-main"><header className="ak-topbar"><div className="ak-mobile-brand"><img src="/akiba-logo.png" alt="" />Akiba</div><div className="ak-workspace-top-crumb"><Link href="/workspace">Workspace</Link><span>/</span><strong>Messages</strong></div><div className="ak-topbar-right"><NotificationBell /><MessageBell /></div></header>
      <div className="ak-dashboard-content ak-workspace-content"><div className="ak-workspace-page-heading"><div><span className="ak-section-eyebrow">GROUP CONVERSATIONS</span><h1>Messages</h1><p>Your unread conversations, grouped by the latest unread activity.</p></div><Link className="ak-workspace-back" href="/workspace">← Back to workspace</Link></div>
        <section className="ak-workspace-card"><div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">UNREAD INBOX</span><h2>Groups that need your attention</h2><p>{rows.length} {rows.length === 1 ? "group" : "groups"} with unread messages</p></div><span className="ak-count-pill">{total} unread</span></div>
          {error ? <div className="ak-workspace-empty" role="alert"><strong>Messages couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div> : rows.length === 0 ? <div className="ak-workspace-empty"><strong>You’re all caught up</strong><p>New unread group conversations will appear here.</p><Link href="/workspace/groups" className="ak-finance-inline-link">Browse your groups →</Link></div> : <div className="ak-notification-date-groups">{Array.from(grouped.entries()).map(([heading, items]) => <section className="ak-notification-date-group" key={heading}><h3>{heading}</h3><div className="ak-message-inbox-list">{items.map((item) => <Link className="ak-message-inbox-row" href={"/workspace/groups/" + item.group_id + "/chat"} key={item.group_id}><span className="ak-message-inbox-icon">▣</span><span className="ak-message-inbox-copy"><strong>{item.group_name}</strong><small>You have {Number(item.unread_count)} unread {Number(item.unread_count) === 1 ? "message" : "messages"} from {item.group_name}.</small><time>{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(item.latest_unread_at))}</time></span><span className="ak-group-unread-badge">{Number(item.unread_count) > 99 ? "99+" : item.unread_count}</span><span className="ak-chevron">›</span></Link>)}</div></section>)}</div>}
        </section><footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer></div>
    </section></main>;
}
