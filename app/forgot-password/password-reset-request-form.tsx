"use client";

import { useState, useTransition, type FormEvent } from "react";
import { preparePasswordReset } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialError?: string;
  initialMessage?: string;
};

export default function PasswordResetRequestForm({ initialError, initialMessage }: Props) {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState(initialError ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setMessage("");

    startTransition(async () => {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const prepared = await preparePasswordReset(normalizedEmail);
        if (prepared.status === "error") {
          setErrorMessage(prepared.message);
          return;
        }
        if (prepared.status === "message") {
          setMessage(prepared.message);
          return;
        }

        // Use the origin serving this form, not NEXT_PUBLIC_SITE_URL. This
        // keeps the recovery callback on the same deployment/browser origin
        // where Supabase SSR stores the PKCE verifier.
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("type", "recovery");
        callback.searchParams.set("flow", "recovery");

        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: callback.toString(),
        });
        if (error) {
          console.error("Akiba password recovery request failed", { code: error.code });
          setErrorMessage("We couldn't send a password reset link. Please try again.");
          return;
        }
        setMessage(prepared.successMessage);
      } catch {
        setErrorMessage("Password recovery is temporarily unavailable. Please try again.");
      }
    });
  }

  return (
    <>
      {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button type="submit" disabled={pending} aria-live="polite">
          {pending ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>
    </>
  );
}
