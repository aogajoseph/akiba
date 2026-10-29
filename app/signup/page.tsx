import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/workspace");
  const params = await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
    <div className="workspace-eyebrow">START TOGETHER</div><h1>Create your account</h1>
    <p className="auth-description">Set up your Akiba account to create and manage Groups.</p>
    {params.error && <p className="auth-error" role="alert">{params.error}</p>}
    <form action={signUp} className="auth-form"><label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /><small>Use at least 8 characters.</small></label><button className="workspace-primary" type="submit">Create account</button></form>
    <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
    <p className="auth-footnote">Email confirmation may be required depending on Akiba’s Supabase Auth settings.</p>
  </section></main>;
}
