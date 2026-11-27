import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import {
  cancelGroupInvitation,
  sendGroupInvitationEmailAction,
  leaveGroup,
  removeGroupMember,
  setGroupAdmin,
  stepDownGroupAdmin,
  unblockGroupMember,
  decideGroupJoinRequest,
  reactivateGroup,
} from "@/app/workspace/actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell from "@/app/workspace/notification-bell";
import MessageBell from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import InviteGroupModal from "./invite-group-modal";
import DeactivateGroupForm from "./deactivate-group-form";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ membershipError?: string; membershipUpdated?: string; memberSearch?: string }>;
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

  const [{ data: membership }, { data: plan }, { data: memberRows, error: membersError }, { data: invitations }, { data: blocks }, { data: joinRequests }] = await Promise.all([
    supabase.from("akiba_group_memberships").select("role,status,joined_at").eq("group_id", group.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_group_plan_entitlements").select("max_members,max_group_admins,required_group_admins").eq("plan_code", group.group_plan_code).maybeSingle(),
    supabase.from("akiba_group_memberships").select("user_id,role,joined_at").eq("group_id", group.id).eq("status", "active").order("joined_at", { ascending: true }),
    supabase.from("akiba_group_invitations").select("id,inviter_id,recipient_email,recipient_username,status,expires_at,created_at").eq("group_id", group.id).eq("status", "pending").order("created_at", { ascending: false }).limit(25),
    group.created_by === user.id
      ? supabase.from("akiba_group_blocks").select("user_id,blocked_at").eq("group_id", group.id).order("blocked_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    group.created_by === user.id
      ? supabase.from("akiba_group_join_requests").select("id,user_id,created_at").eq("group_id", group.id).eq("status", "pending").order("created_at", { ascending: true }).limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (!membership || membership.status !== "active") notFound();

  const members: Member[] = [];
  const memberIds = (memberRows ?? []).map((row) => row.user_id);
  const relatedIds = Array.from(new Set([
    ...memberIds,
    ...(invitations ?? []).map((invite) => invite.inviter_id),
    ...(blocks ?? []).map((block) => block.user_id),
    ...(joinRequests ?? []).map((request) => request.user_id),
  ]));
  const { data: profiles } = relatedIds.length
    ? await supabase.from("akiba_profiles").select("user_id,display_name,username,avatar_path").in("user_id", relatedIds)
    : { data: [] as Profile[] };
  const profilesById = new Map((profiles ?? []).map((item) => [item.user_id, item]));
  for (const row of memberRows ?? []) {
    members.push({ ...row, profile: profilesById.get(row.user_id) });
  }

  const memberSearch = (query.memberSearch ?? "").trim().toLocaleLowerCase();
  const visibleMembers = memberSearch
    ? members.filter((member) => [member.profile?.display_name, member.profile?.username, roleLabel(member.role)]
        .some((value) => value?.toLocaleLowerCase().includes(memberSearch)))
    : members;
  const isCreator = group.created_by === user.id && membership.role === "group_creator";
  const isAdmin = membership.role === "group_admin";
  const maxMembers = plan?.max_members ?? 100;
  const activeAdminCount = members.filter((member) => member.role === "group_admin").length;
  const requiredAdminCount = plan?.required_group_admins ?? 3;
  const capacityReached = members.length >= maxMembers;
  let shareInviteUrl: string | null = null;
  const configuredSiteUrl = process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl && group.status === "active" && !capacityReached) {
    try {
      const { randomBytes, createHash } = await import("node:crypto");
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const { data: persistentToken, error: linkError } = await supabase.rpc("akiba_get_or_create_group_invite_link", {
        p_group_id: group.id,
        p_token: token,
        p_token_hash: tokenHash,
      });
      if (!linkError && persistentToken && /^[0-9a-f]{64}$/.test(persistentToken)) {
        shareInviteUrl = new URL("/invitations/" + persistentToken, configuredSiteUrl).toString();
      } else if (linkError) {
        console.error("Akiba group invitation link could not be loaded", { message: linkError.message });
      }
    } catch (linkError) {
      console.error("Akiba group invitation link URL could not be prepared", {
        message: linkError instanceof Error ? linkError.message : "Unknown error",
      });
    }
  }

  const userAvatarUrl = profile.avatar_path
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
          <Link href="/workspace/groups" className="ak-nav-link active"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <NotificationSidebarLink />
          <MessagesSidebarLink />
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <Link href="/workspace/profile" className="ak-nav-link"><span>♙</span>Edit Profile</Link>
          <Link href="/workspace/account-settings" className="ak-nav-link"><span>⚙</span>Account Settings</Link>
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
          <div className="ak-workspace-top-crumb"><Link href="/workspace/groups">My Groups</Link><span>/</span><Link href={"/workspace/groups/" + group.id}>{group.name}</Link><span>/</span><strong>Membership</strong></div>
          <div className="ak-topbar-right"><NotificationBell /><MessageBell /><div className="ak-topbar-avatar">{userAvatarUrl ? <img src={userAvatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-page-heading ak-membership-page-heading">
            <div className="ak-membership-heading-copy">
              <span className="ak-section-eyebrow">GROUP MEMBERSHIP</span>
              <h1>{group.name}</h1>
              <p>Manage the people, roles and invitations that keep this group moving.</p>
              <div className="ak-membership-heading-meta">
                <span className={group.status === "active" ? "ak-membership-status is-active" : "ak-membership-status is-inactive"}>{group.status === "active" ? "Active group" : "Group deactivated"}</span>
                <span className="ak-membership-your-role">Your role: <strong>{roleLabel(membership.role)}</strong></span>
              </div>
            </div>
            <Link className="ak-workspace-back" href={"/workspace/groups/" + group.id}>← Back to overview</Link>
          </div>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <Link href={"/workspace/groups/" + group.id}><DashboardOutlinedIcon />Overview</Link>
            <Link href={"/workspace/groups/" + group.id + "/finances"}><AccountBalanceWalletOutlinedIcon />Finances</Link>
            <Link className="active" aria-current="page" href={"/workspace/groups/" + group.id + "/membership"}><GroupsOutlinedIcon />Membership</Link>
            <Link className="" href={`/workspace/groups/${group.id}/chat`}><ChatBubbleOutlineOutlinedIcon />Chat</Link>
            <span aria-disabled="true" title="Group settings are coming soon"><SettingsOutlinedIcon />Settings</span>
          </nav>

          {query.membershipError && <p className="ak-finance-error" role="alert">{query.membershipError}</p>}
          {query.membershipUpdated && <p className="ak-workspace-footnote" role="status">{query.membershipUpdated}</p>}

          {group.status !== "active" && (
            <section className="ak-workspace-card">
              <strong>This group has been deactivated.</strong><p>Invitations and membership changes are no longer available.</p>
              {group.status === "deactivated" && group.scheduled_delete_at && <p>Scheduled for deletion: {formatDate(group.scheduled_delete_at)}</p>}
              {isCreator && group.status === "deactivated" && (
                <form action={reactivateGroup}>
                  <input type="hidden" name="group_id" value={group.id} />
                  <button type="submit">Reactivate group</button>
                  <p className="ak-workspace-footnote">Reactivation restores the group so unresolved financial matters can be reviewed and settled. Your action is recorded.</p>
                </form>
              )}
            </section>
          )}

          {isCreator && group.status === "active" && (
            <section className="ak-workspace-card ak-membership-requests">
              <div className="ak-workspace-card-heading">
                <div><span className="ak-section-eyebrow">MEMBERSHIP REVIEW</span><h2>Join requests</h2><p>People who opened a group invitation link and asked to join. They become members only after you approve.</p></div>
                <span className="ak-count-pill">{joinRequests?.length ?? 0} pending</span>
              </div>
              {!joinRequests?.length ? (
                <div className="ak-workspace-empty"><strong>No pending join requests</strong><p>New requests from shared invitation links will appear here.</p></div>
              ) : (
                <div className="ak-workspace-member-list">{joinRequests.map((request) => {
                  const requester = profilesById.get(request.user_id);
                  const name = requester?.display_name?.trim() || "Akiba member";
                  const photo = requester?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(requester.avatar_path).data.publicUrl : null;
                  return <div className="ak-workspace-member" key={request.id}>
                    {photo ? <img src={photo} alt="" /> : <span className="ak-workspace-member-fallback">{initials(name)}</span>}
                    <div><strong>{name}</strong><small>{requester?.username ? "@" + requester.username : "Akiba member"} · Requested {formatDate(request.created_at)}</small></div>
                    <div className="ak-workspace-member-role">
                      <form action={decideGroupJoinRequest}>
                        <input type="hidden" name="group_id" value={group.id} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button type="submit">Approve</button>
                      </form>
                      <form action={decideGroupJoinRequest}>
                        <input type="hidden" name="group_id" value={group.id} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <button type="submit">Decline</button>
                      </form>
                    </div>
                  </div>;
                })}</div>
              )}
            </section>
          )}

          <div className="ak-workspace-overview-grid">
            <div className="ak-workspace-primary-column">
              <section className="ak-workspace-card">
                <div className="ak-workspace-card-heading ak-membership-directory-heading">
                  <div><span className="ak-section-eyebrow">MEMBER DIRECTORY</span><h2>People in this group</h2><p>Everyone who is currently part of this group, including you.</p></div>
                  <div className="ak-membership-counts">
                    <span className="ak-membership-stat"><strong>{members.length}</strong><small>of {maxMembers} people</small></span>
                    <span className="ak-membership-stat"><strong>{activeAdminCount}</strong><small>of {requiredAdminCount} Admins</small></span>
                  </div>
                </div>
                {activeAdminCount < requiredAdminCount && group.status === "active" && <p className="ak-membership-leadership-note">Contributions remain blocked until the Group Creator appoints {requiredAdminCount} Group Admins.</p>}
                <form method="get" className="ak-membership-search-form" role="search">
                  <label htmlFor="memberSearch">Search members</label>
                  <div><input id="memberSearch" name="memberSearch" type="search" placeholder="Name, username or role" defaultValue={query.memberSearch ?? ""} /><button type="submit">Search</button>{memberSearch && <Link href={"/workspace/groups/" + group.id + "/membership"}>Clear</Link>}</div>
                </form>
                {!membersError && <div className="ak-membership-results-meta"><span>{memberSearch ? `Showing ${visibleMembers.length} of ${members.length} people` : `${members.length} active ${members.length === 1 ? "person" : "people"}`}</span><span>Creator-led membership</span></div>}
                {membersError ? <div className="ak-workspace-empty"><strong>Members couldn’t be loaded</strong><p>Please refresh the page to try again.</p></div>
                  : visibleMembers.length === 0 ? <div className="ak-workspace-empty"><strong>No matching members</strong><p>Try another name, username or role.</p></div>
                  : <div className="ak-workspace-member-list">{visibleMembers.map((member) => {
                    const name = member.profile?.display_name?.trim() || "Akiba member";
                    const photo = member.profile?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(member.profile.avatar_path).data.publicUrl : null;
                    const isSelf = member.user_id === user.id;
                    return <div className="ak-workspace-member ak-membership-person" key={member.user_id}>
                      <Link className="ak-profile-member-link" href={member.profile?.username ? "/workspace/people/" + encodeURIComponent(member.profile.username) : "/workspace"}>
                        {photo ? <img src={photo} alt="" /> : <span className="ak-workspace-member-fallback">{initials(name)}</span>}
                        <span className="ak-membership-person-copy"><strong>{name}{isSelf ? <em>You</em> : null}</strong><small>{member.profile?.username ? "@" + member.profile.username : "Akiba member"}</small></span>
                      </Link>
                      <div className="ak-workspace-member-role ak-membership-person-role"><span className={member.role !== "member" ? "admin" : ""}>{roleLabel(member.role)}</span>
                        {isCreator && !isSelf && group.status === "active" && <details className="ak-member-actions ak-membership-action-menu">
                          <summary>Manage</summary>
                          <div className="ak-membership-action-menu-content">
                          <form action={setGroupAdmin}>
                            <input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="user_id" value={member.user_id} />
                            <input type="hidden" name="action" value={member.role === "group_admin" ? "demote" : "appoint"} />
                            <button type="submit" aria-label={member.role === "group_admin" ? `Demote ${name} to Member` : `Appoint ${name} as Group Admin`} disabled={!plan || (member.role === "member" && activeAdminCount >= (plan.max_group_admins ?? 0))}>{member.role === "group_admin" ? "Demote" : "Appoint Admin"}</button>
                          </form>
                          <form action={removeGroupMember}>
                            <input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="user_id" value={member.user_id} />
                            <button type="submit" className="ak-member-danger" aria-label={`Remove ${name} from this group`}>Remove</button>
                          </form>
                          <form action={removeGroupMember}>
                            <input type="hidden" name="group_id" value={group.id} /><input type="hidden" name="user_id" value={member.user_id} /><input type="hidden" name="block" value="true" />
                            <button type="submit" className="ak-member-danger" aria-label={`Block ${name} from this group`}>Block</button>
                          </form>
                          </div>
                        </details>}
                      </div>
                    </div>;
                  })}</div>}
                {isCreator && <p className="ak-workspace-footnote">You are the permanent Group Creator. Only you can manage Admin appointments, remove members or block access.</p>}
                {isAdmin && <p className="ak-workspace-footnote">As a Group Admin, you can invite people and leave the group. The Creator manages membership and leadership.</p>}
              </section>

              <section className="ak-workspace-card">
                <div className="ak-workspace-card-heading"><div><span className="ak-section-eyebrow">INVITATIONS</span><h2>Pending Invitations</h2><p>Invitations that are still waiting to be accepted. All active group members can view them; only the inviter or Group Creator can cancel an invitation.</p></div></div>
                {!invitations?.length ? <div className="ak-workspace-empty"><strong>No pending invitations</strong><p>New invitations will appear here until they are accepted, cancelled or expire.</p></div> :
                  <div className="ak-workspace-member-list">{(invitations as Invitation[]).map((invite) => {
                    const inviter = profilesById.get(invite.inviter_id);
                    const recipient = invite.recipient_username ? "@" + invite.recipient_username : invite.recipient_email || "Shareable invitation link";
                    const canCancel = invite.inviter_id === user.id || isCreator;
                    return <div className="ak-workspace-member" key={invite.id}>
                      <span className="ak-workspace-member-fallback">↗</span>
                      <div><strong>{recipient}</strong><small>Invited by {inviter?.display_name || inviter?.username || "Group member"} · {formatDate(invite.created_at)}</small></div>
                      <div className="ak-workspace-member-role"><span>Pending</span>
                        {canCancel && group.status === "active" && <form action={cancelGroupInvitation}>
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
                <span className="ak-invite-symbol">＋</span>
                <span className="ak-section-eyebrow">GROW THE GROUP</span>
                <h2>Grow your group</h2>
                {group.status !== "active" ? (
                  <p>This group is deactivated and cannot receive invitations.</p>
                ) : capacityReached ? (
                  <p role="alert"><strong>Group capacity reached.</strong> You cannot invite more people until a space becomes available.</p>
                ) : (
                  <InviteGroupModal groupId={group.id} inviteAction={sendGroupInvitationEmailAction} shareUrl={shareInviteUrl} />
                )}
                <p className="ak-workspace-footnote">Email invitations expire after 7 days. Pending invitations do not reserve a membership slot.</p>
              </section>

              {isCreator && group.status === "active" && (
                <section className="ak-workspace-card">
                  <span className="ak-section-eyebrow">GROUP LIFECYCLE</span>
                  <h2>Deactivate group</h2>
                  <p>Deactivation is available only after all pending financial activity, withdrawals, payout reconciliation, held funds and the group balance are settled. Groups with financial history retain their financial records.</p>
                  <DeactivateGroupForm groupId={group.id} />
                  <p className="ak-workspace-footnote">The group remains viewable for six months. You can review permanent deletion eligibility from the group actions menu.</p>
                </section>
              )}

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

            </aside>
          </div>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
