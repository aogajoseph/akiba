import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changePassword, signOutOtherSessions } from "../profile/actions";
import { EmailChangeForm } from "../profile/email-change-form";
import { ProfileSubmitButton } from "../profile/profile-submit-button";
import ThemePreference, { } from "./theme-preference";
import AccountDeletionForm from "./account-deletion-form";

type Group = {
  id: string;
  name: string;
  status: "active" | "deactivated" | "deleted";
  group_image_path: string | null;
  created_by: string | null;
  scheduled_delete_at: string | null;
};
type Membership = { group_id: string; role: "group_creator" | "group_admin" | "member"; status: string; joined_at: string };

type Props = { searchParams: Promise<{ error?: string; success?: string; deleteError?: string }> };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}
function roleLabel(role: Membership["role"]) {
  return role === "group_creator" ? "Group Creator" : role === "group_admin" ? "Group Admin" : "Member";
}
function statusLabel(status: Group["status"]) {
  return status === "active" ? "Active" : status === "deactivated" ? "Deactivated · retention period" : "Deleted";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default async function AccountSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/account-settings"));

  const [{ data: profile, error: profileError }, { data: settings, error: settingsError }, initialMemberships] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_user_settings").select("theme").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_group_memberships").select("group_id,role,status,joined_at").eq("user_id", user.id).order("joined_at", { ascending: false }).range(0, 499),
  ]);
  if (profileError || !profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/account-settings"));

  const memberships: Membership[] = (initialMemberships.data ?? []) as Membership[];
  let membershipError = Boolean(initialMemberships.error);
  for (let offset = 500; !membershipError && memberships.length >= offset; offset += 500) {
    const { data, error } = await supabase.from("akiba_group_memberships")
      .select("group_id,role,status,joined_at").eq("user_id", user.id)
      .order("joined_at", { ascending: false }).range(offset, offset + 499);
    if (error) { membershipError = true; break; }
    const page = (data ?? []) as Membership[];
    memberships.push(...page);
    if (page.length < 500) break;
  }

  const ownedResult = await supabase.from("akiba_groups")
    .select("id,name,status,group_image_path,created_by,scheduled_delete_at")
    .eq("created_by", user.id).range(0, 499);
  const groupIds = Array.from(new Set([...memberships.map((item) => item.group_id), ...(ownedResult.data ?? []).map((item) => item.id)]));
  const groupResult = groupIds.length
    ? await supabase.from("akiba_groups").select("id,name,status,group_image_path,created_by,scheduled_delete_at").in("id", groupIds)
    : { data: [], error: null };
  const groupError = Boolean(ownedResult.error || groupResult.error);
  const groups = new Map<string, Group>();
  for (const group of [...(ownedResult.data ?? []), ...(groupResult.data ?? [])] as Group[]) groups.set(group.id, group);

  const visibleMemberships = memberships.filter((item) => item.status === "active" && groups.get(item.group_id)?.status !== "deleted");
  const adminGroups = memberships.filter((item) => item.role === "group_admin" && groups.get(item.group_id)?.status !== "deleted");
  const creatorGroups = Array.from(groups.values()).filter((group) => group.created_by === user.id && group.status !== "deleted");
  const unresolvedCreatorMembership = memberships.some((item) => item.role === "group_creator" && groups.get(item.group_id)?.status !== "deleted");
  const deletionDataAvailable = !membershipError && !groupError;
  const canDelete = deletionDataAvailable && adminGroups.length === 0 && creatorGroups.length === 0 && !unresolvedCreatorMembership;
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const displayName = profile.display_name;
  const theme = !settingsError && ["light", "dark", "system"].includes(settings?.theme ?? "")
    ? settings!.theme as "light" | "dark" | "system" : "system";
  const params = await searchParams;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <Link href="/workspace/profile" className="ak-nav-link"><span>♙</span>Edit Profile</Link>
          <Link href="/workspace/account-settings" className="ak-nav-link active" aria-current="page"><span>⚙</span>Account Settings</Link>
        </nav>
        <div className="ak-sidebar-bottom"><div className="ak-sidebar-user">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{initials(displayName)}</span>}
          <span className="ak-sidebar-user-copy"><strong>{displayName}</strong><small>@{profile.username}</small></span>
        </div></div>
      </aside>
      <section className="ak-main">
        <header className="ak-topbar"><Link href="/workspace" className="ak-settings-back-link">← Back to workspace</Link><div className="ak-topbar-right">{avatarUrl ? <img className="ak-topbar-avatar" src={avatarUrl} alt="" /> : <span className="ak-topbar-avatar">{initials(displayName)}</span>}</div></header>
        <div className="ak-dashboard-content">
          <div className="ak-welcome"><div><div className="ak-eyebrow">ACCOUNT</div><h1>Account Settings</h1><p>Manage your Akiba account and preferences.</p></div></div>
          {params.error && <p className="ak-settings-inline-note" role="alert">{params.error}</p>}
          {params.success && <p className="ak-settings-success" role="status">{params.success}</p>}
          {params.deleteError && <p className="ak-settings-inline-note" role="alert">{params.deleteError}</p>}

          <section className="ak-panel ak-settings-section" aria-labelledby="appearance-heading">
            <div className="ak-panel-heading"><div><h2 id="appearance-heading">Appearance</h2><p>Choose how Akiba looks across your devices.</p></div></div>
            <ThemePreference initialTheme={theme} />
          </section>

          <section className="ak-panel ak-settings-section" aria-labelledby="my-groups-heading">
            <div className="ak-panel-heading"><div><h2 id="my-groups-heading">My Groups</h2><p>Every group you currently belong to, with your role and its status.</p></div><span className="ak-count-pill">{visibleMemberships.length}</span></div>
            {membershipError || groupError ? <p className="ak-settings-inline-note" role="alert">We couldn’t load all your groups. Refresh this page to try again.</p>
              : visibleMemberships.length === 0 ? <div className="ak-workspace-empty"><strong>You don’t belong to any groups yet.</strong><p>Groups you create or join will appear here.</p><Link href="/workspace/groups">Browse My Groups</Link></div>
              : <div className="ak-account-groups-list">{visibleMemberships.map((membership) => {
                const group = groups.get(membership.group_id);
                if (!group) return null;
                const imageUrl = group.group_image_path ? supabase.storage.from("group-images").getPublicUrl(group.group_image_path).data.publicUrl : null;
                return <Link className="ak-account-group-row" href={"/workspace/groups/" + group.id} key={group.id}>
                  {imageUrl ? <img className="ak-account-group-avatar" src={imageUrl} alt="" /> : <span className="ak-account-group-avatar ak-account-group-fallback">{initials(group.name)}</span>}
                  <span className="ak-account-group-copy"><strong>{group.name}</strong><small>{roleLabel(membership.role)}</small></span>
                  <span className={"ak-account-group-status " + (group.status === "active" ? "is-active" : "is-inactive")}>{statusLabel(group.status)}</span>
                  <span className="ak-account-group-arrow" aria-hidden="true">→</span>
                </Link>;
              })}</div>}
          </section>

          <section className="ak-panel ak-settings-section" aria-labelledby="account-access-heading">
            <div className="ak-panel-heading"><div><h2 id="account-access-heading">Account Access</h2><p>Manage the email and credentials you use to sign in to Akiba.</p></div></div>
            <div className="ak-account-access-block"><h3>Sign-in email</h3><p className="ak-account-current-email">{user.email ?? "No email address available"}</p><EmailChangeForm /></div>
            <div className="ak-settings-divider" />
            <div className="ak-account-access-block"><h3>Password</h3><p>Choose a strong password you do not use elsewhere.</p>
              <form action={changePassword} className="ak-group-settings-form">
                <div className="ak-settings-fields">
                  <label className="ak-settings-field"><span>New password</span><input name="new_password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /><small>Use at least 10 characters.</small></label>
                  <label className="ak-settings-field"><span>Confirm new password</span><input name="confirm_password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></label>
                </div>
                <div className="ak-settings-save-row"><p>Your password is updated through Akiba Authentication.</p><ProfileSubmitButton idle="Update password" pending="Updating password..." /></div>
              </form>
            </div>
            <div className="ak-settings-divider" />
            <div className="ak-account-access-block"><h3>Active sessions</h3><p>Sign out of other devices while keeping this session open.</p>
              <form action={signOutOtherSessions} className="ak-group-settings-form"><div className="ak-settings-save-row"><p>Other sessions may remain active until their access tokens expire or refresh.</p><ProfileSubmitButton className="ak-settings-secondary-button ak-settings-signout-button" idle="Sign out other sessions" pending="Signing out other sessions..." /></div></form>
            </div>
          </section>

          <section className="ak-panel ak-settings-section" aria-labelledby="subscription-heading">
            <div className="ak-panel-heading"><div><h2 id="subscription-heading">Subscription</h2><p>Subscription plans and account upgrades will be available in a future release.</p></div><span className="ak-account-coming-soon">Coming soon</span></div>
            <div className="ak-account-subscription-placeholder"><span aria-hidden="true">✦</span><div><strong>Akiba subscriptions are coming soon</strong><p>Subscription management will be introduced in a future release. No payment setup is needed right now.</p></div></div>
          </section>

          <section className="ak-panel ak-settings-section ak-account-danger-zone" aria-labelledby="danger-zone-heading">
            <div className="ak-panel-heading"><div><h2 id="danger-zone-heading">Danger Zone</h2><p>Permanently delete your Akiba account.</p></div></div>
            <div className="ak-account-danger-intro"><strong>Account deletion is restricted by your group responsibilities.</strong><p>You can delete your account only after you are no longer a Group Creator or Group Admin in any group that has not completed deletion.</p></div>
            {adminGroups.length > 0 && <div className="ak-account-blockers"><h3>Step down as Group Admin first</h3><p>You must relinquish the Group Admin role in every group before account deletion.</p>{adminGroups.map((membership) => { const group = groups.get(membership.group_id); return group ? <Link key={group.id} href={"/workspace/groups/" + group.id + "/membership"}>{group.name} · Manage membership →</Link> : null; })}</div>}
            {creatorGroups.length > 0 && <div className="ak-account-blockers"><h3>Resolve groups you created</h3><p>Delete a group only when it has no financial history, pending activity or balance. Otherwise resolve outstanding activity and deactivate it; it can be deleted by the six-month retention process.</p>
              {creatorGroups.map((group) => <div className="ak-account-owned-group" key={group.id}><strong>{group.name}</strong><small>{group.status === "deactivated" ? "Scheduled for automatic deletion " + (group.scheduled_delete_at ? formatDate(group.scheduled_delete_at) : "after six months") : "Active group · ownership must be resolved"}</small><span><Link href={"/workspace/groups/" + group.id + "/delete"}>Check deletion eligibility</Link><Link href={"/workspace/groups/" + group.id + "/membership"}>Manage / deactivate group</Link></span></div>)}
            </div>}
            {!deletionDataAvailable && <p className="ak-settings-inline-note" role="alert">We could not verify your group responsibilities. Account deletion is disabled until the group list can be checked.</p>}
            <AccountDeletionForm enabled={canDelete} lastSignInAt={user.last_sign_in_at ?? null} />
          </section>
        </div>
      </section>
    </main>
  );
}
