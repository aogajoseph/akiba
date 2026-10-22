import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: group, error } = await supabase.from("akiba_groups").select("id,name,purpose,description,currency_code,created_at").eq("id", groupId).maybeSingle();
  if (error || !group) notFound();
  const { data: membership } = await supabase.from("akiba_group_memberships").select("role,status,joined_at").eq("group_id", group.id).eq("user_id", user.id).maybeSingle();
  if (!membership || membership.status !== "active") notFound();
  return <main className="real-workspace"><header className="real-topbar"><Link href="/workspace" className="auth-brand"><span className="workspace-mark">a</span> akiba</Link><div><span className="real-user">{user.email}</span><form action={signOut}><button className="text-btn" type="submit">Sign out</button></form></div></header><section className="real-content"><Link href="/workspace" className="back-link">← Back to Groups</Link><div className="workspace-eyebrow">{group.purpose === "event" ? "EVENT GROUP" : "GOAL GROUP"}</div><h1>{group.name}</h1><p className="auth-description">{group.description || "A shared space for plans and coordination."}</p><div className="real-detail-grid"><article className="real-detail-card"><small>Purpose</small><b>{group.purpose === "event" ? "Event" : "Goal"}</b></article><article className="real-detail-card"><small>Base currency</small><b>{group.currency_code}</b></article><article className="real-detail-card"><small>Your role</small><b>{membership.role === "admin" ? "Group administrator" : "Member"}</b></article><article className="real-detail-card"><small>Membership</small><b>{membership.status === "active" ? "Active" : membership.status}</b></article></div><section className="real-empty"><h2>Group workspace foundation</h2><p>This Group is now loaded from the database, and access is checked against your active membership. Invitations, chat, contributions and activity history will be enabled in later steps.</p></section></section><footer className="real-footer">Akiba · A Globe Software product · No financial activity is enabled.</footer></main>;
}
