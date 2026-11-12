import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { acceptGroupInvitation, declineGroupInvitation } from "@/app/workspace/actions";
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
  const { data: invitation } = await admin.from("akiba_group_invitations")
    .select("group_id,inviter_id,status,expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!invitation) notFound();

  const [{ data: group }, { data: inviter }, { data: { user } }] = await Promise.all([
    admin.from("akiba_groups").select("id,name,description,status").eq("id", invitation.group_id).maybeSingle(),
    admin.from("akiba_profiles").select("display_name,username").eq("user_id", invitation.inviter_id).maybeSingle(),
    (await createClient()).auth.getUser(),
  ]);
  if (!group) notFound();

  // Expiry is enforced by the database when an invitation is accepted.
  // Avoid deriving time-sensitive state during render.
  const status = invitation.status !== "pending" ? invitation.status : group.status !== "active" ? "unavailable" : "pending";
  const next = "/invitations/" + token;
  const inviterName = inviter?.display_name?.trim() || (inviter?.username ? "@" + inviter.username : "A group member");

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
        <div className="workspace-eyebrow">You&apos;re invited</div>
        <h1>{group.name}</h1>
        <p>{group.description?.trim() || "You've been invited to join a group on Akiba."}</p>
        <p className="auth-switch">Invited by {inviterName}</p>
        {actionError && <p className="auth-error" role="alert">{actionError}</p>}
        {status !== "pending" ? (
          <div className="auth-message" role="status">
            {status === "expired" ? "This invitation has expired."
              : status === "accepted" ? "This invitation has already been accepted."
                : status === "declined" ? "This invitation was declined."
                  : status === "cancelled" ? "This invitation was cancelled."
                    : "This group is no longer accepting members."}
          </div>
        ) : !user ? (
          <div className="auth-form">
            <p>Sign in or create an Akiba account to accept this invitation.</p>
            <Link className="workspace-primary" href={"/login?next=" + encodeURIComponent(next)}>Sign in to accept</Link>
            <p className="auth-switch">New to Akiba? <Link href={"/signup?next=" + encodeURIComponent(next)}>Create an account</Link></p>
          </div>
        ) : (
          <div className="auth-form">
            <p>Accepting this invitation will add you as a Member of this group.</p>
            <form action={acceptGroupInvitation}>
              <input type="hidden" name="token" value={token} />
              <button className="workspace-primary" type="submit">Accept invitation</button>
            </form>
            <form action={declineGroupInvitation}>
              <input type="hidden" name="token" value={token} />
              <button className="profile-secondary-button" type="submit">Decline invitation</button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
