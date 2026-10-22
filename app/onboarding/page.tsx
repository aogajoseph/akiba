import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsernameField from "./username-field";
import { saveUsername } from "./actions";
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{error?: string}> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("akiba_profiles").select("username").eq("user_id", user.id).maybeSingle();
  if (profile) redirect("/workspace");
  const { error } = await searchParams;
  return <main className="auth-shell"><section className="auth-card"><Link href="/" className="auth-brand">akiba</Link><div className="workspace-eyebrow">ONE LAST STEP</div><h1>Choose your username</h1><p className="auth-description">Your unique @username identifies you on Akiba. You can create or join a Group later.</p>{error && <p className="auth-error" role="alert">{error}</p>}<form action={saveUsername} className="auth-form"><UsernameField/><button type="submit" className="workspace-primary">Complete profile</button></form></section></main>;
}
