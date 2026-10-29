"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SignupForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
          ? "Unable to create an account. If you have already registered, please sign in."
          : "Unable to create account. Please try again.");
      } else if (data.session) {
        window.location.assign("/onboarding");
        return;
      } else {
        // Supabase may return a non-error response for existing accounts.
        // Never promise a message was sent or expose account existence.
        setMessage("If this address is eligible for confirmation, an email will arrive shortly. Already registered? Sign in instead.");
      }
    } catch {
      setError("Unable to create account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="auth-message" role="status">{message}</p>}
    <form onSubmit={submit} className="auth-form">
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /><small>Use at least 8 characters.</small></label>
      <button className="workspace-primary" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
  </>;
}
