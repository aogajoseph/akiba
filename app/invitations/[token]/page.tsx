import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { acceptGroupInviteLink, acceptGroupInvitation, declineGroupInvitation } from "@/app/workspace/actions";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function InvitationPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error: actionError } = await searchParams;
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
  const [{ data: reusableLink }, { data: invitation }] = await Promise.all([
    admin.from("akiba_group_invite_links").select("group_id,created_by").eq("token_hash", hash).maybeSingle(),
    admin.from("akiba_group_invitations").select("group_id,inviter_id,status,expires_at,recipient_email").eq("token_hash", hash).maybeSingle(),
  ]);

  const isReusableLink = Boolean(reusableLink);
  const groupId = reusableLink?.group_id ?? invitation?.group_id;
  if (!groupId) notFound();

  const inviterId = reusableLink?.created_by ?? invitation?.inviter_id;
  const [{ data: group }, { data: inviter }, { data: { user } }] = await Promise.all([
    admin.from("akiba_groups").select("id,name,description,status").eq("id", groupId).maybeSingle(),
    inviterId
      ? admin.from("akiba_profiles").select("display_name,username").eq("user_id", inviterId).maybeSingle()
      : Promise.resolve({ data: null }),
    (await createClient()).auth.getUser(),
  ]);
  if (!group) notFound();

  const status = isReusableLink
    ? group.status === "active" ? "pending" : "unavailable"
    : invitation!.status !== "pending" ? invitation!.status : group.status !== "active" ? "unavailable" : "pending";

  const next = "/invitations/" + token;
  const invitedEmail = invitation?.recipient_email?.trim().toLowerCase() ?? null;
  const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
  const emailMismatch = !isReusableLink && Boolean(user && invitedEmail && signedInEmail !== invitedEmail);
  const inviterName = inviter?.display_name?.trim() || (inviter?.username ? "@" + inviter.username : "A group member");

  if (isReusableLink && user && status === "pending") {
    const { data: membership } = await (await createClient()).from("akiba_group_memberships")
      .select("status").eq("group_id", groupId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (membership) redirect("/workspace/groups/" + groupId);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
        <div className="workspace-eyebrow">{isReusableLink ? "Join this group" : "You're invited"}</div>
        <h1>{group.name}</h1>
        <p>{group.description?.trim() || "You've been invited to join a group on Akiba."}</p>
        <p className="auth-switch">{isReusableLink ? "Shared by " : "Invited by "}{inviterName}</p>
        {actionError && <p className="auth-error" role="alert">{actionError}</p>}
        {status !== "pending" ? (
          <div className="auth-message" role="status">
            {status === "expired" ? "This invitation has expired."
              : status === "accepted" ? "This invitation has already been accepted."
                : status === "declined" ? "This invitation was declined."
                  : status === "cancelled" ? "This invitation was cancelled."
                    : "This group is no longer accepting members."}
          </div>
        ) : emailMismatch ? (
          <div className="auth-form">
            <p>This invitation was sent to <strong>{invitation?.recipient_email}</strong>, but you&apos;re currently signed in as <strong>{user?.email}</strong>.</p>
            <p>To accept this invitation, sign out and then sign in or create an Akiba account using the invited email address.</p>
            <form action={signOut}>
              <input type="hidden" name="next" value={next} />
              <button className="workspace-primary" type="submit">Switch account</button>
            </form>
          </div>
        ) : !user ? (
          <div className="auth-form">
            <p>Create an Akiba account or sign in to join this group.</p>
            <Link className="workspace-primary" href={"/login?next=" + encodeURIComponent(next)}>Sign in to join</Link>
            <p className="auth-switch">New to Akiba? <Link href={"/signup?next=" + encodeURIComponent(next)}>Create an account</Link></p>
          </div>
        ) : (
          <div className="auth-form">
            <p>Joining will add you as a Member of this group.</p>
            {isReusableLink ? (
              <form action={acceptGroupInviteLink}>
                <input type="hidden" name="token" value={token} />
                <button className="workspace-primary" type="submit">Join group</button>
              </form>
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
