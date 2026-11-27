"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManualSandboxPayoutTrigger({ requestId }: { requestId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function submit() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/internal/payments/mpesa/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
        cache: "no-store",
      });
      const result = await response.json() as { error?: string; accepted?: number };
      if (!response.ok) throw new Error(result.error ?? "The sandbox payout could not be submitted.");
      setMessage(result.accepted === 1
        ? "Daraja accepted the sandbox instruction. Waiting for callback and reconciliation; this is not yet a completed payout."
        : "The worker ran. Review the withdrawal status and reconciliation details before taking another action.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The sandbox payout trigger failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ak-withdrawal-actions">
      <button type="button" className="ak-finance-primary-button" onClick={submit} disabled={pending}>
        {pending ? "Submitting to Daraja sandbox…" : "Submit one sandbox payout"}
      </button>
      <small>Manual action. This submits at most one instruction to the configured sandbox test recipient. Do not click again if the result is unknown; reconcile the existing attempt first.</small>
      {message && <p role="status" aria-live="polite">{message}</p>}
    </div>
  );
}
