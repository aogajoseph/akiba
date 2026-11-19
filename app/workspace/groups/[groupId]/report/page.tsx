import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GroupReportForm from "../group-report-form";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ submitted?: string; error?: string }>;
};

export default async function ReportGroupPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/groups/" + groupId + "/report"));

  const { data: group } = await supabase.from("akiba_groups")
    .select("id,name,status").eq("id", groupId).maybeSingle();
  if (!group) notFound();

  return (
    <main className="ak-dashboard ak-workspace-app">
      <section className="ak-main">
        <header className="ak-topbar">
          <div className="ak-workspace-top-crumb">
            <Link href={"/workspace/groups/" + group.id}>Back to group</Link>
            <span>/</span><strong>Report Group</strong>
          </div>
        </header>
        <div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-group-report-panel">
            <span className="ak-section-eyebrow">GROUP SAFETY</span>
            <h1>Report Group</h1>
            <p className="ak-group-report-intro">You&apos;re reporting <strong>{group.name}</strong>. Choose the reason that best describes your concern.</p>
            {query?.submitted === "1" ? (
              <div className="ak-group-report-success" role="status">
                <strong>Your report has been submitted.</strong>
                <p>Thank you for bringing this to our attention. We&apos;re reviewing your report and will take action as soon as possible. Submitting a report does not automatically suspend or remove a group.</p>
                <Link href={"/workspace/groups/" + group.id}>Return to group</Link>
              </div>
            ) : (
              <GroupReportForm groupId={group.id} errorMessage={query?.error} />
            )}
            <Link className="ak-group-report-cancel" href={"/workspace/groups/" + group.id}>Cancel</Link>
          </section>
        </div>
      </section>
    </main>
  );
}
