import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import {
  cancelGroupInvitation,
  createGroupInvitation,
  leaveGroup,
  removeGroupMember,
  setGroupAdmin,
  stepDownGroupAdmin,
  unblockGroupMember,
} from "@/app/workspace/actions";
import { createClient } from "@/lib/supabase/server";
import CopyInvitationLink from "./copy-invitation-link";
import DeactivateGroupForm from "./deactivate-group-form";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ membershipError?: string; membershipUpdated?: string; inviteUrl?: string }>;
};
type Profile = { user_id: string; display_name: string | null; username: string; avatar_path: string | null };
type Member = { user_id: string; role: "group_creator" | "group_admin" | "member"; joined_at: string; profile?: Profile };
type Invitation = {
  id: string;
  inviter_id: string;
  recipient_email: string | null;
  recipient_username: string | null;
  status: string;
  expires_at: string;
  created_at: string;
};

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function roleLabel(role: Member["role"]) {
  return role === "group_creator" ? "Group Creator" : role === "group_admin" ? "Group Admin" : "Member";
}

export default async function GroupMembershipPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/workspace/groups/" + groupId + "/membership"));

  const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
    supabase.from("akiba_groups").select("id,name,description,status,scheduled_delete_at,group_plan_code,created_by").eq("id", groupId).maybeSingle(),
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
  ]);
  if (groupError || !group) notFound();
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/groups/" + groupId + "/membership"));

  const [{ data: membership }, { data: plan }, { data: memberRows, error: membersError }, { data: invitations }, { data: blocks }] = await Promise.all([
    supabase.from("akiba_group_memberships").select("role,status,joined_at").eq("group_id", group.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_group_plan_entitlements").select("max_members,max_group_admins,required_group_admins").eq("plan_code", group.group_plan_code).maybeSingle(),
    supabase.from("akiba_group_memberships").select("user_id,role,joined_at").eq("group_id", group.id).eq("status", "active").order("joined_at", { ascending: true }),
    supabase.from("akiba_group_invitations").select("id,inviter_id,recipient_email,recipient_username,status,expires_at,created_at").eq("group_id", group.id).order("created_at", { ascending: false }).limit(25),
    group.created_by === user.id
      ? supabase.from("akiba_group_blocks").select("user_id,blocked_at").eq("group_id", group.id).order("blocked_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (!membership || membership.status !== "active") notFound();

  const members: Member[] = [];
  const memberIds = (memberRows ?? []).map((row) => row.user_id);
  const relatedIds = Array.from(new Set([
    ...memberIds,
    ...(invitations ?? []).map((invite) => invite.inviter_id),
    ...(blocks ?? []).map((block) => block.user_id),
  ]));
  const { data: profiles } = relatedIds.length
    ? await supabase.from("akiba_profiles").select("user_id,display_name,username,avatar_path").in("user_id", relatedIds)
    : { data: [] as Profile[] };
  const profilesById = new Map((profiles ?? []).map((item) => [item.user_id, item]));
  for (const row of memberRows ?? []) {
    members.push({ ...row, profile: profilesById.get(row.user_id) });
  }

  const isCreator = membership.role === "group_creator";
  const isAdmin = membership.role === "group_admin";
  const maxMembers = plan?.max_members ?? 100;
  const activeAdminCount = members.filter((member) => member.role === "group_admin").length;
  const requiredAdminCount = plan?.required_group_admins ?? 3;
  const capacityReached = members.length >= maxMembers;
  let shareInviteUrl: string | null = null;
  const configuredSiteUrl = process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : process.env.NEXT_PUBLIC_SITE_URL;
  if (query.inviteUrl && configuredSiteUrl) {
    try {
      const supplied = new URL(query.inviteUrl);
      const expectedOrigin = new URL(configuredSiteUrl).origin;
      if (supplied.origin === expectedOrigin && /^\/invitations\/[0-9a-f]{64}$/.test(supplied.pathname)) {
        shareInviteUrl = supplied.toString();
      }
    } catch { /* Ignore invalid invite URLs supplied in the query string. */ }
  }

  const userAvatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace#your-groups" className="ak-nav-link active"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>◷</span>Chat<small className="ak-coming">Soon</small></span>
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>♙</span>My Profile</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>⚙</span>Settings</span>
        </nav>
        <div className="ak-sidebar-bottom">
          <div className="ak-sidebar-promo"><span className="ak-promo-mark">✳</span><strong>Do more, together</strong><p>Bring people together around the things that matter.</p><Link href="/workspace/new">Create a group <span>→</span></Link></div>
          <div className="ak-sidebar-user">
            {userAvatarUrl ? <img src={userAvatarUrl} alt="" /> : <span className="ak-avatar-fallback">{initials(profile.display_name)}</span>}
            <span className="ak-sidebar-user-copy"><strong>{profile.display_name}</strong><small>@{profile.username}</small></span>
            <form action={signOut}><button type="submit" aria-label="Sign out" title="Sign out">↗</button></form>
          </div>
        </div>
      </aside>

      <section className="ak-main">
        <header className="ak-topbar">
          <div className="ak-mobile-brand"><img src="/akiba-logo.png" alt="" />Akiba</div>
          <div className="ak-workspace-top-crumb"><Link href="/workspace">My Groups</Link><span>/</span><Link href={"/workspace/groups/" + group.id}>{group.name}</Link><span>/</span><strong>Membership</strong></div>
          <div className="ak-topbar-right"><span className="ak-topbar-greeting">Your space, together</span><div className="ak-topbar-avatar">{userAvatarUrl ? <img src={userAvatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-page-heading">
            <div><span className="ak-section-eyebrow">GROUP MEMBERSHIP</span><h1>{group.name}</h1><p>People, invitations and leadership in this group.</p></div>
            <Link className="ak-workspace-back" href={"/workspace/groups/" + group.id}>← Back to overview</Link>
          </div>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <Link href={"/workspace/groups/" + group.id}><DashboardOutlinedIcon />Overview</Link>
            <Link href={"/workspace/groups/" + group.id + "/finances"}><AccountBalanceWalletOutlinedIcon />Finances</Link>
            <Link className="active" aria-current="page" href={"/workspace/groups/" + group.id + "/membership"}><GroupsOutlinedIcon />Membership</Link>
            <span aria-disabled="true" title="Group chat is coming soon"><ChatBubbleOutlineOutlinedIcon />Chat</span>
            <span aria-disabled="true" title="Group settings are coming soon"><SettingsOutlinedIcon />Settings</span>
          </nav>

          {query.membershipError && <p className="ak-finance-error" role="alert">{query.membershipError}</p>}
          {query.membershipUpdated && <p className="ak-workspace-footnote" role="status">{query.membershipUpdated}</p>}

          {group.status !== "active" && (
            <section className="ak-workspace-card"><strong>This group has been deactivated.</strong><p>Invitations and membership changes are no longer available.</p>
              {group.status === "deactivated" && group.scheduled_delete_at && <p>Scheduled for deletion: {formatDate(group.scheduled_delete_at)}</p>}
            </section>
          )}

          <div className="ak-workspace-overview-grid">
            <div className="ak-workspace-primary-column">
              <section className="ak-workspace-card">
                <div className="ak-workspace-card-heading">
                  <div><span className="ak-section-eyebrow">MEMBER DIRECTORY</span><h2>People in this group</h2><p>Everyone who is currently part of this group, including you.</p></div>
                  <div className="ak-membership-counts"><span className="ak-count-pill">{members.length} / {maxMembers} people</span><span className="ak-count-pill">{activeAdminCount} / {requiredAdminCount} Admins</span></div>
                </div>
                {activeAdminCount < requiredAdminCount && group.status === "active" && <p className="ak-membership-leadership-note">Contributions remain blocked until the Group Creator appoints {requiredAdminCount} Group Admins.</p>}
                {membersError ? <div className="ak-workspace-empty"><strong>Members couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
                  : <div className="ak-workspace-member-list">{members.map((member) => {
                    const name = member.profile?.display_name?.trim() || "Akiba member";
                    const photo = member.profile?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(member.profile.avatar_path).data.publicUrl : null;
                    const isSelf = member.user_id === user.id;
                    return <div className="ak-workspace-member" key={member.user_id}>
                      {photo ? <img src={photo} alt="" /> : <span className="ak-workspace-member-fallback">{initials(name)}</span>}
                      <div><strong>{name}{isSelf ? <em>You</em> : null}</strong><small>{member.profile?.username ? "@" + member.profile.username : "Akiba member"}</small></div>
                      <div className="ak-workspace-member-role"><span className={member.role !== "member" ? "admin" : ""}>{roleLabel(member.role)}</span>
                        {isCreator && !isSelf && group.status === "active" && <div className="ak-member-actions">
                          <form action={setGroupAdmin}>
                            <input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="user_id" value={member.user_id} />
                            <input type="hidden" name="action" value={member.role === "group_admin" ? "demote" : "appoint"} />
                            <button type="submit" disabled={!plan || (member.role === "member" && activeAdminCount >= (plan.max_group_admins ?? 0))}>{member.role === "group_admin" ? "Demote" : "Appoint Admin"}</button>
                          </form>
                          <form action={removeGroupMember}>
                            <input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="user_id" value={member.user_id} />
                            <button type="submit" className="ak-member-danger">Remove</button>
                          </form>
                          <form action={removeGroupMember}>
                            <input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="user_id" value={member.user_id} /><input type="hidden" name="block" value="true" />
                            <button type="submit" className="ak-member-danger">Block</button>
                          </form>
                        </div>}
                      </div>
                    </div>;
                  })}</div>}
                {isCreator && <p className="ak-workspace-footnote">You are the permanent Group Creator. Only you can manage Admin appointments, remove members or block access.</p>}
                {isAdmin && <p className="ak-workspace-footnote">As a Group Admin, you can invite people and leave the group. The Creator manages membership and leadership.</p>}
              </section>

              <section className="ak-workspace-card">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">INVITATIONS</span><h2>Your invitations</h2><p>Invitations you created and their current status. The Group Creator can see all group invitations.</p></div></div>
                {!invitations?.length ? <div className="ak-workspace-empty"><strong>No invitations yet</strong><p>Invitations created by group members will appear here.</p></div> :
                  <div className="ak-workspace-member-list">{(invitations as Invitation[]).map((invite) => {
                    const inviter = profilesById.get(invite.inviter_id);
                    const recipient = invite.recipient_username ? "@" + invite.recipient_username : invite.recipient_email || "Shareable invitation link";
                    const canCancel = invite.inviter_id === user.id || isCreator;
                    return <div className="ak-workspace-member" key={invite.id}>
                      <span className="ak-workspace-member-fallback">↗</span>
                      <div><strong>{recipient}</strong><small>Invited by {inviter?.display_name || inviter?.username || "Group member"} · {formatDate(invite.created_at)}</small></div>
                      <div className="ak-workspace-member-role"><span>{invite.status === "pending" && new Date(invite.expires_at).getTime() <= Date.now() ? "Expired" : invite.status.replaceAll("_", " ")}</span>
                        {invite.status === "pending" && canCancel && group.status === "active" && <form action={cancelGroupInvitation}>
                          <input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="invitation_id" value={invite.id} />
                          <button type="submit" className="ak-member-danger">Cancel</button>
                        </form>}
                      </div>
                    </div>;
                  })}</div>}
              </section>
            </div>

            <aside className="ak-workspace-side-column">
              <section className="ak-workspace-card ak-workspace-invite">
                <span className="ak-invite-symbol">＋</span><span className="ak-section-eyebrow">GROW THE GROUP</span><h2>Invite someone</h2>
                {capacityReached && group.status === "active" ? (
                  <p role="alert"><strong>Group capacity reached.</strong> You cannot invite more people until a space becomes available.</p>
                ) : group.status !== "active" ? (
                  <p>This group is deactivated and cannot receive invitations.</p>
                ) : (
                  <>
                    <p>Every active group member can invite people. Enter a username or email, or leave both blank to create a shareable link.</p>
                    <form action={createGroupInvitation} className="ak-membership-invite-form">
                      <input type="hidden" name="group_id" value={group.id} />
                      <label>Akiba username <input name="recipient_username" placeholder="username" autoComplete="off" /></label>
                      <div className="ak-membership-or">or</div>
                      <label>Email address <input name="recipient_email" type="email" placeholder="name@example.com" autoComplete="email" /></label>
                      <button type="submit" className="workspace-primary">Create invitation</button>
                    </form>
                  </>
                )}
                {shareInviteUrl && <div className="ak-membership-share-link"><strong>Invitation created</strong><p>Share this secure link with the intended recipient.</p><CopyInvitationLink url={shareInviteUrl} /></div>}
                <p className="ak-workspace-footnote">Invitations expire after 7 days. Pending invitations do not reserve a membership slot.</p>
              </section>

              {isCreator && group.status === "active" && (
                <section className="ak-workspace-card">
                  <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">BLOCKED PEOPLE</span><h2>Blocked from this group</h2></div></div>
                  {!blocks?.length ? <div className="ak-workspace-empty"><strong>No blocked people</strong><p>People you block will appear here.</p></div> :
                    <div className="ak-workspace-member-list">{blocks.map((block) => {
                      const blockedProfile = profilesById.get(block.user_id);
                      return <div className="ak-workspace-member" key={block.user_id}>
                        <span className="ak-workspace-member-fallback">!</span>
                        <div><strong>{blockedProfile?.display_name || "Akiba member"}</strong><small>@{blockedProfile?.username || "member"}</small></div>
                        <form action={unblockGroupMember}><input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="user_id" value={block.user_id} /><button type="submit">Unblock</button></form>
                      </div>;
                    })}</div>}
                </section>
              )}

              {!isCreator && group.status === "active" && (
                <section className="ak-workspace-card">
                  <span className="ak-section-eyebrow">YOUR MEMBERSHIP</span>
                  <h2>{isAdmin ? "Group Admin" : "Member"}</h2>
                  <p>{isAdmin ? "Step down to ordinary Member first. You can then leave the group separately." : "You can leave this group at any time."}</p>
                  <form action={isAdmin ? stepDownGroupAdmin : leaveGroup}>
                    <input type="hidden" name="group_id" value={group.id} />
                    <button type="submit" className="ak-member-danger">{isAdmin ? "Step down as Group Admin" : "Leave group"}</button>
                  </form>
                </section>
              )}

              {isCreator && group.status === "active" && (
                <section className="ak-workspace-card ak-workspace-danger-card">
                  <span className="ak-section-eyebrow">GROUP LIFECYCLE</span>
                  <h2>Deactivate group</h2>
                  <p>When the group's purpose is fulfilled, deactivate it. Invitations, membership changes and new financial activity will stop immediately. The six-month retention period starts at deactivation.</p>
                  <DeactivateGroupForm groupId={group.id} />
                  <p className="ak-workspace-footnote">The Group Creator cannot leave or transfer this role.</p>
                </section>
              )}
            </aside>
          </div>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
