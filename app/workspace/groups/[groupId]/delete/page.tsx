import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reactivateGroup } from "@/app/workspace/actions";
import GroupDeleteForm from "./group-delete-form";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

type Eligibility = {
  can_hard_delete: boolean;
  has_financial_history: boolean;
  has_unresolved_financial_activity: boolean;
  balance_minor: number;
  held_minor: number;
  reasons: string[];
  group_name: string;
  group_status: string;
};

export default async function DeleteGroupPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const query = searchParams ? await searchParams : {};
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/groups/" + groupId + "/delete"));

  const [{ data: group, error: groupError }, { data: membership }] = await Promise.all([
    supabase.from("akiba_groups").select("id,name,status,created_by").eq("id", groupId).maybeSingle(),
    supabase.from("akiba_group_memberships").select("role,status").eq("group_id", groupId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (groupError || !group) notFound();
  if (!membership || membership.status !== "active") notFound();
  const isCreator = group.created_by === user.id && membership.role === "group_creator";
  if (!isCreator) {
    return (
      <main className="ak-dashboard ak-workspace-app">
        <section className="ak-main"><div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-group-report-panel">
            <span className="ak-section-eyebrow">GROUP MANAGEMENT</span>
            <h1>Delete Group</h1>
            <p>Only the Group Creator can permanently delete this group.</p>
            <Link className="ak-group-report-cancel" href={"/workspace/groups/" + groupId}>← Back to group</Link>
          </section>
        </div></section>
      </main>
    );
  }

  const { data: eligibilityData, error: eligibilityError } = await supabase.rpc(
    "akiba_group_deletion_eligibility",
    { p_group_id: groupId },
  );
  const eligibility = eligibilityData as Eligibility | null;

  return (
    <main className="ak-dashboard ak-workspace-app">
      <section className="ak-main">
        <header className="ak-topbar">
          <div className="ak-workspace-top-crumb">
            <Link href={"/workspace/groups/" + groupId}>Back to group</Link>
            <span>/</span><strong>Delete Group</strong>
          </div>
        </header>
        <div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-group-report-panel">
            <span className="ak-section-eyebrow">GROUP MANAGEMENT</span>
            <h1>Delete Group</h1>
            <p className="ak-group-report-intro">You are managing the deletion of <strong>{group.name}</strong>. Akiba checks the financial records directly before allowing permanent deletion.</p>
            {query.error && <p className="ak-group-report-error" role="alert">{query.error}</p>}
            {eligibilityError || !eligibility ? (
              <p className="ak-group-report-error" role="alert">Akiba could not verify this group&apos;s deletion eligibility. Please refresh and try again.</p>
            ) : eligibility.can_hard_delete ? (
              <>
                <div className="ak-group-report-privacy">
                  <strong>Permanent deletion is available.</strong> Akiba found no financial history, pending financial activity, held funds or group balance. The server will repeat these checks when you confirm.
                </div>
                <GroupDeleteForm groupId={group.id} groupName={group.name} />
              </>
            ) : (
              <>
                <div className="ak-group-report-error" role="alert">
                  <strong>This group cannot be permanently deleted.</strong>
                  <p>Financial history must be preserved for accountability, even when the balance is zero. Pending transactions, unresolved withdrawals or payouts, held funds, and any remaining group balance must also be settled before deactivation.</p>
                  {eligibility.has_financial_history && <p>This group has financial history. Hard deletion is permanently disallowed.</p>}
                  {eligibility.has_unresolved_financial_activity && <p>There is unresolved financial activity that must be completed or reconciled.</p>}
                  {Number(eligibility.held_minor) !== 0 && <p>Funds are still reserved or held.</p>}
                  {Number(eligibility.balance_minor) !== 0 && <p>The group balance is not zero.</p>}
                </div>
                {group.status === "deactivated" && (
                  <form action={reactivateGroup}>
                    <input type="hidden" name="group_id" value={group.id} />
                    <button className="ak-group-report-submit" type="submit">Reactivate group to settle financial matters</button>
                  </form>
                )}
                <p className="ak-group-report-intro">Once all financial matters are settled, a group with financial history can be deactivated. It remains viewable for six months before Akiba removes its social content and profile details while preserving financial evidence.</p>
                <Link className="ak-group-report-cancel" href={"/workspace/groups/" + group.id + "/membership"}>Open group membership and lifecycle settings</Link>
              </>
            )}
            <Link className="ak-group-report-cancel" href={"/workspace/groups/" + group.id}>Cancel and return to group</Link>
          </section>
        </div>
      </section>
    </main>
  );
}
