"use client";

import { useFormStatus } from "react-dom";
import { deleteAkibaAccount } from "./actions";

function DeleteButton() {
  const { pending } = useFormStatus();
  return <button className="ak-member-danger" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Deleting account..." : "Permanently delete my account"}</button>;
}

export default function AccountDeletionForm({ enabled, lastSignInAt }: { enabled: boolean; lastSignInAt: string | null }) {
  const recentSignIn = Boolean(lastSignInAt && Date.now() - new Date(lastSignInAt).getTime() <= 15 * 60 * 1000);
  return (
    <form className="ak-account-delete-form" action={deleteAkibaAccount}>
      <label className="ak-settings-field">
        <span>Confirm deletion</span>
        <input name="confirmation" required autoComplete="off" spellCheck={false} placeholder="DELETE MY ACCOUNT" />
        <small>Type DELETE MY ACCOUNT exactly to confirm.</small>
      </label>
      {!recentSignIn && <p className="ak-settings-inline-note">For your security, sign out and sign in again before deleting your account. Account deletion is available for 15 minutes after a fresh sign-in.</p>}
      <label className="ak-account-delete-acknowledgement"><input type="checkbox" name="acknowledge" value="yes" required /> I understand that my account will be permanently deleted and my personal profile will be removed. Financial records required by my groups will be retained with my identity anonymised.</label>
      <DeleteButton />
      {!enabled && <p className="ak-settings-inline-note">Resolve the group roles and ownership shown above before deleting your account.</p>}
      <input type="hidden" name="recent_sign_in" value={recentSignIn ? "yes" : "no"} />
    </form>
  );
}
