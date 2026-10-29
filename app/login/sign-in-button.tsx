"use client";

import { useFormStatus } from "react-dom";

export default function SignInButton() {
  const { pending } = useFormStatus();
  return <button className="workspace-primary" type="submit" disabled={pending}>
    {pending ? "Signing in..." : "Sign in"}
  </button>;
}
