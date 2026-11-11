import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./signup-form";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/workspace");
  const params = await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
    <div className="workspace-eyebrow">Do more, together.</div><h1>Create your account</h1>
    {params.error && <p className="auth-error" role="alert">{params.error}</p>}
    <SignupForm />
    <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
  </section></main>;
}
