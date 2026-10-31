import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: profile } = await supabase
    .from("akiba_profiles")
    .select("username, display_name, avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.display_name?.trim()) redirect("/onboarding");
  const { data: groups, error } = await supabase.from("akiba_groups").select("id,name,purpose,description,currency_code,created_at").order("created_at", { ascending: false });
  const avatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;
  return <main className="real-workspace"><header className="real-topbar"><Link href="/" className="auth-brand"><span className="workspace-mark">a</span> akiba</Link><div className="real-account"><div className="real-account-identity">{avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="real-account-fallback">{(profile.display_name || profile.username).slice(0, 1).toUpperCase()}</span>}<span><b>{profile.display_name}</b><small>@{profile.username}</small></span></div><form action={signOut}><button className="text-btn" type="submit">Sign out</button></form></div></header>
    <section className="real-content"><div className="workspace-eyebrow">YOUR PERSONAL SPACE</div><h1>Your workspace</h1><p className="auth-description">Welcome back, {profile.display_name}. Your Groups and shared purposes live here.</p>
      <div className="real-actions"><Link className="workspace-primary" href="/workspace/new">＋ Create a Group</Link><span className="real-user">Signed in as @{profile.username}</span></div>
      {error && <p className="auth-error" role="alert">We could not load Groups. Check the database migration and access policies.</p>}
      {!error && groups?.length === 0 && <section className="real-empty"><h2>Your journey starts with a Group.</h2><p>Create a Group for an event or shared goal. Your space will be ready for you to return to as Akiba grows.</p><Link href="/workspace/new" className="workspace-primary">Create your first Group</Link></section>}
      <div className="real-groups">{(groups ?? []).map((group) => <Link href={"/workspace/groups/" + group.id} className="real-group" key={group.id}><span className="real-group-symbol">{group.purpose === "event" ? "▦" : "◎"}</span><span className="real-group-main"><b>{group.name}</b><small>{group.purpose === "event" ? "Event" : "Goal"} · {group.currency_code}{group.description ? " · " + group.description : ""}</small></span><span className="real-date">{new Date(group.created_at).toLocaleDateString()}</span><span aria-hidden="true">→</span></Link>)}</div>
    </section><footer className="real-footer">Akiba · A Globe Software product · Financial activity is not enabled in this release.</footer></main>;
}
