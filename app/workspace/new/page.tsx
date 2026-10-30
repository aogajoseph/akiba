import Link from "next/link";
import { redirect } from "next/navigation";
import { createGroup } from "@/app/workspace/actions";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewGroupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("akiba_profiles").select("username").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const params = await searchParams;
  return <main className="auth-shell"><section className="auth-card auth-card-wide"><Link href="/workspace" className="back-link">← Back to Groups</Link><div className="workspace-eyebrow">A SHARED PURPOSE</div><h1>Create a Group</h1><p className="auth-description">Choose a name, purpose and currency for this Group. You’ll become its first administrator.</p>
    {params.error && <p className="auth-error" role="alert">{params.error}</p>}
    <form action={createGroup} className="auth-form"><label>Group name<input name="name" maxLength={80} required placeholder="e.g. Family graduation trip" /></label><label>Purpose<select name="purpose" defaultValue="goal" required><option value="event">Event</option><option value="goal">Goal</option></select></label><label>Currency code<input name="currency_code" minLength={3} maxLength={3} pattern="[A-Za-z]{3}" required placeholder="e.g. KES" autoCapitalize="characters" /><small>Enter the ISO 4217 three-letter code. The code is stored in uppercase.</small></label><label>Description (optional)<textarea name="description" maxLength={500} rows={3} placeholder="What is this Group for?" /></label><button className="workspace-primary" type="submit">Create Group</button></form>
    <p className="auth-footnote">This creates a persistent Group record and your initial admin membership. Invitations, contributions and payments are not enabled yet.</p>
  </section></main>;
}
