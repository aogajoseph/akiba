import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");\n  const { data: profile } = await supabase.from("akiba_profiles").select("username").eq("user_id", user.id).maybeSingle();\n  if (!profile) redirect("/onboarding");
  const { data: groups, error } = await supabase.from("akiba_groups").select("id,name,purpose,description,currency_code,created_at").order("created_at", { ascending: false });
  return <main className="real-workspace"><header className="real-topbar"><Link href="/" className="auth-brand"><span className="workspace-mark">a</span> akiba</Link><div><span className="real-user">{user.email}</span><form action={signOut}><button className="text-btn" type="submit">Sign out</button></form></div></header>
    <section className="real-content"><div className="workspace-eyebrow">YOUR COLLECTIVE SPACES</div><h1>Your Groups</h1><p className="auth-description">Groups you create or join will appear here.</p>
      <div className="real-actions"><Link className="workspace-primary" href="/workspace/new">＋ Create a Group</Link><span className="real-user">Signed in as @{profile.username}</span></div>
      {error && <p className="auth-error" role="alert">We could not load Groups. Check the database migration and access policies.</p>}
      {!error && groups?.length === 0 && <section className="real-empty"><h2>Your first Group starts here.</h2><p>Create an Event or Goal Group. Its details will be saved securely in Akiba.</p><Link href="/workspace/new" className="workspace-primary">Create your first Group</Link></section>}
      <div className="real-groups">{(groups ?? []).map((group) => <Link href={"/workspace/groups/" + group.id} className="real-group" key={group.id}><span className="real-group-symbol">{group.purpose === "event" ? "▦" : "◎"}</span><span className="real-group-main"><b>{group.name}</b><small>{group.purpose === "event" ? "Event" : "Goal"} · {group.currency_code}{group.description ? " · " + group.description : ""}</small></span><span className="real-date">{new Date(group.created_at).toLocaleDateString()}</span><span aria-hidden="true">→</span></Link>)}</div>
    </section><footer className="real-footer">Akiba · A Globe Software product · Financial activity is not enabled in this release.</footer></main>;
}
