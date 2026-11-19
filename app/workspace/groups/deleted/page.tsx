import Link from "next/link";

export default function GroupDeletedPage() {
  return (
    <main className="ak-dashboard ak-workspace-app">
      <section className="ak-main">
        <div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-group-report-panel" role="status" aria-live="polite">
            <span className="ak-section-eyebrow">GROUP MANAGEMENT</span>
            <h1>Group permanently deleted</h1>
            <p className="ak-group-report-intro">The group and its non-financial content have been permanently removed. Associated files are queued for secure cleanup. Financial records are never removed through this process.</p>
            <Link href="/workspace/groups" className="ak-group-report-submit">Back to My Groups</Link>
          </section>
        </div>
      </section>
    </main>
  );
}
