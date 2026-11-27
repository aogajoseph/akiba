import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <main className="ak-account-deleted-page">
      <div className="ak-account-deleted-card">
        <span className="ak-account-deleted-mark" aria-hidden="true">✓</span>
        <p className="ak-eyebrow">AKIBA ACCOUNT</p>
        <h1>Your account has been deleted</h1>
        <p>Your Akiba sign-in account and personal profile have been removed. Required group and financial records have been retained with your identity anonymised.</p>
        <Link href="/">Return to Akiba</Link>
      </div>
    </main>
  );
}
