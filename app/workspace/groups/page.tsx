import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell, { type NotificationBellItem } from "@/app/workspace/notification-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";

type Group = {
  id: string;
  name: string;
  purpose: string;
  group_type: string;
  description: string | null;
  currency_code: string;
  created_at: string;
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value));
}

export default async function MyGroupsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/groups"));

  const [{ data: profile }, initialGroups, unreadResult, notificationCountResult, notificationPreviewResult] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_groups").select("id,name,purpose,group_type,description,currency_code,created_at")
      .order("created_at", { ascending: false }).range(0, 499),
    supabase.rpc("akiba_list_my_group_chat_unread_counts"),
    supabase.rpc("akiba_count_my_unread_group_notifications"),
    supabase.rpc("akiba_list_my_group_notifications", { p_limit: 5 }),
  ]);
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/groups"));

  const groups: Group[] = (initialGroups.data ?? []) as Group[];
  const notificationCount = Number(notificationCountResult.data ?? 0);
  const notificationPreview = (notificationPreviewResult.data ?? []) as NotificationBellItem[];
  const unreadByGroup = new Map<string, number>(
    ((unreadResult.data ?? []) as { group_id: string; unread_count: number | string }[])
      .map((row) => [row.group_id, Number(row.unread_count)]),
  );
  let groupsError = Boolean(initialGroups.error);
  // Fetch subsequent pages so the directory is not limited to the dashboard's
  // five-item preview or the API's per-request row cap.
  for (let offset = 500; !groupsError && groups.length >= offset; offset += 500) {
    const { data, error } = await supabase.from("akiba_groups")
      .select("id,name,purpose,group_type,description,currency_code,created_at")
      .order("created_at", { ascending: false }).range(offset, offset + 499);
    if (error) {
      groupsError = true;
      break;
    }
    const page = (data ?? []) as Group[];
    groups.push(...page);
    if (page.length < 500) break;
  }

  const avatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;
  const displayName = profile.display_name;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <NotificationRealtime />
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link active" aria-current="page"><span>♧</span>My Groups{groups.length > 0 && <small>{groups.length}</small>}</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <NotificationSidebarLink /><span>♢</span>Notifications</Link>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>◷</span>Chat<small className="ak-coming">Soon</small></span>
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>♙</span>My Profile</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>⚙</span>Settings</span>
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

      <section className="ak-main">
        <header className="ak-topbar">
          <div className="ak-mobile-brand"><img src="/akiba-logo.png" alt="" />Akiba</div>
          <div className="ak-workspace-top-crumb"><Link href="/workspace">Workspace</Link><span>/</span><strong>My Groups</strong></div>
          <div className="ak-topbar-right"><NotificationBell unreadCount={notificationCount} notifications={notificationPreview.slice(0, 5)} /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(displayName)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-page-heading">
            <div><span className="ak-section-eyebrow">YOUR WORKSPACE</span><h1>My Groups</h1><p>All the groups you created or joined, in one place.</p></div>
            <Link href="/workspace/new" className="ak-primary"><span>＋</span> Create New Group</Link>
          </div>

          <section className="ak-workspace-card">
            <div className="ak-workspace-card-heading">
              <div><span className="ak-section-eyebrow">GROUP DIRECTORY</span><h2>Your groups</h2><p>{groupsError ? "We couldn't confirm the full list." : groups.length + (groups.length === 1 ? " group" : " groups") + " you belong to"}</p></div>
              {!groupsError && <span className="ak-count-pill">{groups.length}</span>}
            </div>
            {groupsError ? <div className="ak-workspace-empty" role="alert"><strong>Your groups couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
              : groups.length === 0 ? <div className="ak-workspace-empty"><strong>You haven’t joined a group yet</strong><p>Create a group for a celebration, a family goal, a trip or anything you want to organise together.</p><Link href="/workspace/new" className="ak-primary">＋ Create your first Group</Link></div>
                : <div className="ak-group-list">{groups.map((group) => (
                  <Link href={"/workspace/groups/" + group.id} className="ak-group-row" key={group.id}>
                    <span className={"ak-group-icon " + (group.purpose === "event" ? "event" : "goal")}>{group.purpose === "event" ? "▦" : "◎"}</span>
                    <span className="ak-group-copy"><strong>{group.name}</strong><small>{group.purpose === "event" ? "Event" : group.purpose === "chama" ? "Chama" : "Goal"} · {group.group_type.replaceAll("_", " ")} · {group.currency_code}{group.description ? " · " + group.description : ""}</small></span>
                    {(unreadByGroup.get(group.id) ?? 0) > 0 && <span className="ak-group-unread-badge" aria-label={(unreadByGroup.get(group.id) ?? 0) + " unread messages"}>{(unreadByGroup.get(group.id) ?? 0) > 99 ? "99+" : unreadByGroup.get(group.id)}</span>}
                    <span className="ak-group-date">{shortDate(group.created_at)}</span><span className="ak-chevron">›</span>
                  </Link>
                ))}</div>}
          </section>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
