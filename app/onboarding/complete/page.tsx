import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CompletePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("akiba_profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="workspace-eyebrow">WELCOME TO AKIBA</div>
        <h1>You&apos;re @{profile.username}</h1>
        <p className="auth-description">
          Your profile is ready. Start a Group now or explore your workspace first.
        </p>
        <div className="real-actions">
          <Link className="workspace-primary" href="/workspace/new">Create a Group</Link>
          <Link className="back-link" href="/workspace">Go to workspace →</Link>
        </div>
      </section>
    </main>
  );
}
