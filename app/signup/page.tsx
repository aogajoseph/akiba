import Link from "next/link";
import { safeInternalPath } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./signup-form";

type Props = { searchParams: Promise<{ error?: string; next?: string; email?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/onboarding");
  const invitedEmail = params.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)
    ? params.email.trim().toLowerCase()
    : "";
  if (user) redirect(next);
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
    <div className="workspace-eyebrow">{invitedEmail ? "YOUR GROUP INVITATION" : "Do more, together."}</div><h1>{invitedEmail ? "Create an account to join" : "Create your account"}</h1>
    {invitedEmail && <p>You were invited to join a group. Create your Akiba account with the invited email below. After confirming your email, you’ll return to the invitation to join.</p>}
    {params.error && <p className="auth-error" role="alert">{params.error}</p>}
    <SignupForm next={next} invitedEmail={invitedEmail} />
    <p className="auth-switch">Already registered? <Link href={"/login?next=" + encodeURIComponent(next) + (invitedEmail ? "&email=" + encodeURIComponent(invitedEmail) : "")}>Sign in</Link></p>
  </section></main>;
}
