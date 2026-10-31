"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword } from "@/app/auth-actions";

function SubmitButton({ passwordsMatch }: { passwordsMatch: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending || !passwordsMatch} aria-live="polite">
      {pending ? "Updating password..." : "Update password"}
    </button>
  );
}

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const hasConfirmation = confirmation.length > 0;
  const passwordsMatch = hasConfirmation && password === confirmation;

  return (
    <form action={updatePassword} className="auth-form">
      <label>
        New password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          aria-invalid={hasConfirmation && !passwordsMatch}
          aria-describedby="password-match-status"
        />
      </label>
      <p id="password-match-status" aria-live="polite" role="status">
        {hasConfirmation
          ? passwordsMatch
            ? "Passwords match."
            : "Passwords do not match."
          : ""}
      </p>
      <SubmitButton passwordsMatch={passwordsMatch} />
    </form>
  );
}
