"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordInput from "@/app/auth-password-input";

function getPasswordStrength(password: string) {
  if (!password) return { level: 0, label: "Not entered" };

  const score = [
    password.length >= 6,
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (score >= 6) return { level: 4, label: "Strong" };
  if (score >= 4) return { level: 3, label: "Good" };
  if (score >= 3) return { level: 2, label: "Fair" };
  return { level: 1, label: "Weak" };
}

export default function SignupForm({ next, invitedEmail = "" }: { next: string; invitedEmail?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("Signup is temporarily unavailable.");
      setPending(false);
      return;
    }

    try {
      // Browser-side PKCE stores the verifier in this browser's cookies so the
      // server callback can exchange the confirmation code using that verifier.
      const supabase = createBrowserClient(url, key);
      const callback = new URL("/auth/callback", window.location.origin);
      // Pending invitations are recovered from the authenticated inbox,
      // rather than browser state or user-editable auth metadata.
      const postAuthNext = /^\/invitations\/[0-9a-f]{64}$/.test(next)
        ? "/workspace/invitations"
        : next;
      callback.searchParams.set("next", postAuthNext);
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callback.toString(),
        },
      });
      if (signupError) {
        // Keep diagnostics useful without logging the submitted email or password.
        console.error("Akiba signup rejected", {
          code: signupError.code,
          status: signupError.status,
          name: signupError.name,
        });

        if (signupError.code === "user_already_exists") {
          setError("An account with this email already exists. Please sign in.");
        } else if (signupError.code === "over_email_send_rate_limit") {
          setError("Akiba has temporarily reached its email sending limit. Please wait before trying again. If this continues, contact support.");
        } else if (signupError.status === 429) {
          setError("Too many signup requests have been made. Please wait a moment before trying again.");
        } else if (signupError.code === "email_address_not_authorized") {
          setError("Akiba's email service is not yet enabled for this address. Please contact support.");
        } else {
          setError("Unable to create account. Please try again.");
        }
      } else if (data.session) {
        window.location.assign(postAuthNext);
        return;
      } else if (data.user?.identities?.length === 0) {
        // With email confirmation enabled, Supabase returns an obfuscated user
        // with no identities for an already-registered email.
        setError("An account with this email already exists. Please sign in.");
      } else {
        setMessage(`Account details received. Check ${email} for the confirmation email. After confirming, sign in if prompted; your invitation will be waiting in your Akiba invitation inbox.`);
      }
    } catch (error) {
      console.error("Akiba signup request failed unexpectedly", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      });
      setError("Unable to create account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const strength = getPasswordStrength(password);

  return <>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="auth-message" role="status">{message}</p>}
    <form onSubmit={submit} className="auth-form">
      <label>Email address<input name="email" type="email" autoComplete="email" defaultValue={invitedEmail} readOnly={Boolean(invitedEmail)} required /></label>
      {invitedEmail && <small>This is the email address the invitation was sent to. Use this address to join the group.</small>}
      <label>Password
        <PasswordInput name="password" autoComplete="new-password" required minLength={6} onValueChange={setPassword} />
        <small>Use at least 6 characters.</small>
        <span className="password-strength" aria-live="polite">
          <span className="password-strength-heading">Password strength: <strong>{strength.label}</strong></span>
          <span className="password-strength-meter" role="progressbar" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.level} aria-valuetext={strength.label}>
            {Array.from({ length: 4 }, (_, index) => <span key={index} className={index < strength.level ? `password-strength-segment is-level-${strength.level}` : "password-strength-segment"} />)}
          </span>
        </span>
      </label>
      <button className="workspace-primary" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
  </>;
}
