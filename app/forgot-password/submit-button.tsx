"use client";

import { useFormStatus } from "react-dom";

export default function ResetLinkSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-live="polite">
      {pending ? "Sending reset link..." : "Send reset link"}
    </button>
  );
}
