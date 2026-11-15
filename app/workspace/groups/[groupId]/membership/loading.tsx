export default function GroupMembershipLoading() {
  return (
    <main className="ak-dashboard ak-workspace-app" aria-busy="true">
      <section className="ak-main">
        <div className="ak-dashboard-content ak-workspace-content">
          <div className="ak-workspace-page-heading">
            <div>
              <span className="ak-section-eyebrow">GROUP MEMBERSHIP</span>
              <h1>Loading membership…</h1>
              <p>Getting the member directory and group activity ready.</p>
            </div>
          </div>
          <div className="ak-workspace-overview-grid">
            <div className="ak-workspace-primary-column">
              <section className="ak-workspace-card" aria-label="Loading member directory">
                <div className="ak-workspace-card-heading"><div><h2>People in this group</h2><p>Loading active members…</p></div></div>
                <div className="ak-workspace-member-list">
                  {[1, 2, 3].map((item) => (
                    <div className="ak-workspace-member" key={item}>
                      <span className="ak-workspace-member-fallback" aria-hidden="true">…</span>
                      <div><strong>Loading member</strong><small>Please wait</small></div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="ak-workspace-card" aria-label="Loading group activity">
                <div className="ak-workspace-card-heading"><div><h2>Recent activity</h2><p>Loading group activity…</p></div></div>
              </section>
            </div>
          </div>
          <p className="ak-workspace-footnote" role="status">Loading group membership. Please wait.</p>
        </div>
      </section>
    </main>
  );
}
