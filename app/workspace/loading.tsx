export default function WorkspaceLoading() {
  return (
    <main className="ak-workspace-loading" role="status" aria-live="polite">
      <span className="ak-workspace-loader" aria-hidden="true" />
      <span className="ak-workspace-loading-label">Loading...</span>
    </main>
  );
}
