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

export default function SignupForm() {
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
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: new URL("/auth/callback", window.location.origin).toString() },
      });
      if (signupError) {
        setError(signupError.code === "user_already_exists"
          ? "An account with this email already exists. Please sign in."
          : "Unable to create account. Please try again.");
      } else if (data.session) {
        window.location.assign("/onboarding");
        return;
      } else if (data.user?.identities?.length === 0) {
        // With email confirmation enabled, Supabase returns an obfuscated user
        // with no identities for an already-registered email.
        setError("An account with this email already exists. Please sign in.");
      } else {
        setMessage("Your account has been created. We've sent you an email to verify your address. Click the confirmation link to activate your Akiba account.");
      }
    } catch {
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
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password
        <PasswordInput name="password" autoComplete="new-password" required onValueChange={setPassword} />
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
