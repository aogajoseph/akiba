import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupCreationForm } from "@/app/workspace/new/group-creation-form";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewGroupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("akiba_profiles").select("username").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const params = await searchParams;

  return (
    <main className="auth-shell ak-create-shell">
      <section className="auth-card auth-card-wide ak-create-card">
        <Link href="/workspace" className="back-link">← Back to Groups</Link>
        <div className="workspace-eyebrow">A SHARED PURPOSE</div>
        <h1>Create a Group</h1>
        <p className="auth-description">Choose how you want to bring people together. Akiba will shape your group around its purpose.</p>
        <GroupCreationForm error={params.error} />
      </section>
    </main>
  );
}
