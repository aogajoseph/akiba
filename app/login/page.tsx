import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth-actions";
import SignInButton from "./sign-in-button";
import PasswordInput from "@/app/auth-password-input";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; message?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/workspace";
  if (user) redirect(next);
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
    <div className="workspace-eyebrow">Welcome back.</div><h1>Sign in to Akiba</h1>
    {params.error && <p className="auth-error" role="alert">{params.error}</p>}
    {params.message && <p className="auth-message" role="status">{params.message}</p>}
    <form action={signIn} className="auth-form"><input type="hidden" name="next" value={next} /><label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Password<PasswordInput name="password" autoComplete="current-password" required /></label><SignInButton /></form>
    <p className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></p>
    <p className="auth-switch">New to Akiba? <Link href={"/signup?next=" + encodeURIComponent(next)}>Create an account</Link></p>
  </section></main>;
}
