import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/workspace");
  const params = await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
    <div className="workspace-eyebrow">WELCOME BACK</div><h1>Sign in to Akiba</h1>
    <p className="auth-description">Sign in to see your Groups and continue with your people.</p>
    {params.error && <p className="auth-error" role="alert">{params.error}</p>}
    {params.message && <p className="auth-message" role="status">{params.message}</p>}
    <form action={signIn} className="auth-form"><label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="workspace-primary" type="submit">Sign in</button></form>
    <p className="auth-switch">New to Akiba? <Link href="/signup">Create an account</Link></p>
    <p className="auth-footnote">Prototype stage: Group records are persistent, but collaboration and financial features are not yet active.</p>
  </section></main>;
}
