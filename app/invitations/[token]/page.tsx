import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { requestGroupJoinByLink, acceptGroupInvitation, declineGroupInvitation } from "@/app/workspace/actions";
import { switchToInvitationAccount } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; requested?: string }>;
};

export default async function InvitationPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error: actionError, requested } = await searchParams;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    return <main className="auth-shell"><section className="auth-card">
      <h1>Invitation unavailable</h1>
      <p>We couldn&apos;t load this invitation right now. Please try again later.</p>
    </section></main>;
  }

  const admin = createSupabaseAdminClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const hash = createHash("sha256").update(token).digest("hex");
  const supabase = await createClient();
  const [{ data: reusableLink }, { data: invitation }, { data: { user } }] = await Promise.all([
    admin.from("akiba_group_invite_links").select("group_id,created_by").eq("token_hash", hash).maybeSingle(),
    admin.from("akiba_group_invitations").select("group_id,inviter_id,status,expires_at,recipient_email").eq("token_hash", hash).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const isReusableLink = Boolean(reusableLink);
  const groupId = reusableLink?.group_id ?? invitation?.group_id;
  if (!groupId) notFound();

  const inviterId = reusableLink?.created_by ?? invitation?.inviter_id;
  const [{ data: group }, { data: inviter }] = await Promise.all([
    admin.from("akiba_groups").select("id,name,purpose,group_type,description,status,group_image_path").eq("id", groupId).maybeSingle(),
    inviterId
      ? admin.from("akiba_profiles").select("display_name,username").eq("user_id", inviterId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!group) notFound();
  const groupImageUrl = group.group_image_path
    ? admin.storage.from("group-images").getPublicUrl(group.group_image_path).data.publicUrl
    : null;
  const groupPurpose = group.purpose === "event" ? "Event" : group.purpose === "goal" ? "Goal" : "Group";

  const status = isReusableLink
    ? group.status === "active" ? "pending" : "unavailable"
    : invitation!.status !== "pending" ? invitation!.status : group.status !== "active" ? "unavailable" : "pending";

  const next = "/invitations/" + token;
  // Reusable links remain token-based; email invitations use the durable inbox.
  const authNext = isReusableLink ? next + "?source=link" : "/workspace/invitations";
  const invitedEmail = invitation?.recipient_email?.trim().toLowerCase() ?? null;
  const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
  const emailMismatch = !isReusableLink && Boolean(user && invitedEmail && signedInEmail !== invitedEmail);
  const accountMismatchError = !isReusableLink && Boolean(actionError && (actionError.includes("email address this invitation") || actionError.includes("another Akiba account")));
  const inviterName = inviter?.display_name?.trim() || (inviter?.username ? "@" + inviter.username : "A group member");

  // An invited user must finish their profile before accepting. Send them
  // straight to onboarding and preserve this invitation as the return path.
  if (user && status === "pending" && !emailMismatch) {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("akiba_profiles")
      .select("display_name").eq("user_id", user.id).maybeSingle();
    if (!profile?.display_name?.trim()) {
      const onboardingNext = next + "?complete=1&kind=" + (isReusableLink ? "link" : "email");
      redirect("/onboarding?next=" + encodeURIComponent(onboardingNext));
    }
  }

  let joinRequestPending = false;
  if (isReusableLink && user && status === "pending") {
    const [{ data: membership }, { data: joinRequest }] = await Promise.all([
      supabase.from("akiba_group_memberships").select("status").eq("group_id", groupId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabase.from("akiba_group_join_requests").select("id").eq("group_id", groupId).eq("user_id", user.id).eq("status", "pending").maybeSingle(),
    ]);
    if (membership) redirect("/workspace/groups/" + groupId);
    joinRequestPending = Boolean(joinRequest);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
        <div className="workspace-eyebrow">{isReusableLink ? "Join this group" : "You're invited"}</div>
        {groupImageUrl && <img src={groupImageUrl} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, margin: "12px 0" }} />}
        <h1>{group.name}</h1>
        <p className="auth-switch">{groupPurpose}</p>
        <p>{group.description?.trim() || "You've been invited to join a group on Akiba."}</p>
        <p className="auth-switch">{isReusableLink ? "Shared by " : "Invited by "}{inviterName}</p>
        {actionError && !accountMismatchError && <p className="auth-error" role="alert">{actionError}</p>}
        {status !== "pending" ? (
          <div className="auth-message" role="status">
            {status === "expired" ? "This invitation has expired."
              : status === "accepted" ? "This invitation has already been accepted."
                : status === "declined" ? "This invitation was declined."
                  : status === "cancelled" ? "This invitation was cancelled."
                    : "This group is no longer accepting members."}
          </div>
        ) : emailMismatch || accountMismatchError ? (
          <div className="auth-form">
            <p>This invitation is for <strong>{invitation?.recipient_email}</strong>{user?.email ? <>. You are currently signed in as <strong>{user.email}</strong>.</> : "."}</p>
            <p>To join, use an Akiba account with the invited email address. You can switch accounts or create a new account with that email.</p>
            <form action={switchToInvitationAccount}>
              <input type="hidden" name="next" value={"/signup?next=" + encodeURIComponent(next) + "&email=" + encodeURIComponent(invitedEmail ?? "")} />
              <button className="workspace-primary" type="submit">Continue with invited email</button>
            </form>
            <p className="auth-switch">If you already have an account with the invited email, choose <strong>Sign in</strong> on the next screen.</p>
          </div>
        ) : !user ? (
          <div className="auth-form">
            <p>{isReusableLink
              ? "You’ve been invited to join this group. Create an Akiba account or sign in to continue."
              : <>You’ve been invited to join this group. Use <strong>{invitedEmail}</strong> to create your account or sign in. After you verify your email and complete your profile, this invitation will be waiting in your Akiba invitation inbox.</>}</p>
            <Link className="workspace-primary" href={"/signup?next=" + encodeURIComponent(authNext) + (invitedEmail ? "&email=" + encodeURIComponent(invitedEmail) : "")}>Create an account</Link>
            <p className="auth-switch">Already have an Akiba account? <Link href={"/login?next=" + encodeURIComponent(authNext) + (invitedEmail ? "&email=" + encodeURIComponent(invitedEmail) : "")}>Sign in</Link></p>
          </div>
        ) : (
          <div className="auth-form">
            {isReusableLink ? (
              joinRequestPending || requested === "1" ? (
                <div className="auth-message" role="status">Your request to join this group has been submitted. You will become a member only after the Group Creator approves it.</div>
              ) : (
                <>
                  <p>Send a membership request to the Group Creator. You will not become a member until the request is approved.</p>
                  <form action={requestGroupJoinByLink}>
                    <input type="hidden" name="token" value={token} />
                    <button className="workspace-primary" type="submit">Request to join group</button>
                  </form>
                </>
              )
            ) : (
              <>
                <form action={acceptGroupInvitation}>
                  <input type="hidden" name="token" value={token} />
                  <button className="workspace-primary" type="submit">Accept invitation</button>
                </form>
                <form action={declineGroupInvitation}>
                  <input type="hidden" name="token" value={token} />
                  <button className="profile-secondary-button" type="submit">Decline invitation</button>
                </form>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
