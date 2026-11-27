"use client";

import { useFormStatus } from "react-dom";
import { deleteAkibaAccount } from "./actions";

function DeleteButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return <button className="ak-member-danger" type="submit" disabled={pending || !enabled} aria-busy={pending}>{pending ? "Deleting account..." : "Permanently delete my account"}</button>;
}

export default function AccountDeletionForm({ enabled }: { enabled: boolean }) {
  return (
    <form className="ak-account-delete-form" action={deleteAkibaAccount}>
      <label className="ak-settings-field">
        <span>Confirm deletion</span>
        <input name="confirmation" required autoComplete="off" spellCheck={false} placeholder="DELETE MY ACCOUNT" />
        <small>Type DELETE MY ACCOUNT exactly to confirm.</small>
      </label>
      <p className="ak-settings-inline-note">For your security, account deletion requires a fresh sign-in within 15 minutes. If you signed in earlier, sign out and sign in again before continuing.</p>
      <label className="ak-account-delete-acknowledgement"><input type="checkbox" name="acknowledge" value="yes" required /> I understand that my account will be permanently deleted and my personal profile will be removed. Financial records required by my groups will be retained with my identity anonymised.</label>
      <DeleteButton enabled={enabled} />
      {!enabled && <p className="ak-settings-inline-note">Resolve the group roles and ownership shown above before deleting your account.</p>}
    </form>
  );
}
