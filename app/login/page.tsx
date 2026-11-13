import Link from "next/link";
import { safeInternalPath } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth-actions";
import SignInButton from "./sign-in-button";
import PasswordInput from "@/app/auth-password-input";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; message?: string; next?: string; email?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/workspace");
  const invitedEmail = params.email && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(params.email) ? params.email.trim().toLowerCase() : "";
  if (user) redirect(next);
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
    <div className="workspace-eyebrow">{invitedEmail ? "YOUR GROUP INVITATION" : "Welcome back."}</div><h1>Sign in to join this group</h1>
    {invitedEmail && <p>Use the email address this invitation was sent to.</p>}
    {params.error && <p className="auth-error" role="alert">{params.error}</p>}
    {params.message && <p className="auth-message" role="status">{params.message}</p>}
    <form action={signIn} className="auth-form"><input type="hidden" name="next" value={next} /><label>Email address<input name="email" type="email" autoComplete="email" defaultValue={invitedEmail} required /></label><label>Password<PasswordInput name="password" autoComplete="current-password" required /></label><SignInButton /></form>
    <p className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></p>
    <p className="auth-switch">New to Akiba? <Link href={"/signup?next=" + encodeURIComponent(next) + (invitedEmail ? "&email=" + encodeURIComponent(invitedEmail) : "")}>Create an account</Link></p>
  </section></main>;
}
