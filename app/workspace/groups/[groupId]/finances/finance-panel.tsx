"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type FinancePanelProps = {
  groupId: string;
  currencyCode: string;
  enabled: boolean;
  groupActive: boolean;
  leadershipReady: boolean;
  requiredGroupAdmins: number;
};

type PaymentState = {
  intentId: string;
  paymentStatus: string;
  message: string;
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Awaiting M-Pesa authorization",
    unknown: "Payment status not yet confirmed",
    awaiting_callback_details: "Provider reports success; awaiting receipt confirmation",
    succeeded: "Contribution confirmed",
    failed: "Payment failed",
    cancelled: "Payment cancelled",
    expired: "Payment expired",
    awaiting_authorization: "Awaiting authorization",
    processing: "Processing",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export default function FinancePanel({ groupId, currencyCode, enabled, groupActive, leadershipReady, requiredGroupAdmins }: FinancePanelProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || submitting || payment) return;

    const parsedAmount = Number(amount);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 250000) {
      setError("Enter a whole KES amount between 1 and 250,000.");
      return;
    }
    const digits = phoneNumber.replace(/[^0-9]/g, "");
    if (!/^(?:254[71][0-9]{8}|0[71][0-9]{8}|[71][0-9]{8})$/.test(digits)) {
      setError("Enter a valid Kenyan M-Pesa number, for example 0712345678.");
      return;
    }

    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/contributions/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({
          groupId,
          amountMinor: String(parsedAmount * 100),
          phoneNumber,
          idempotencyKey: key,
        }),
      });
      const result = await response.json();
      if (result.intentId) {
        setPayment({
          intentId: result.intentId,
          paymentStatus: result.paymentStatus ?? "unknown",
          message: result.message ?? result.error ?? "Contribution request received.",
        });
        return;
      }
      setError(result.error ?? "Akiba could not start this contribution. No payment status was created.");
      setIdempotencyKey(null);
    } catch {
      setError("The request could not be confirmed. Do not submit a new contribution yet. Refresh and contact support if no status appears.");
    } finally {
      setSubmitting(false);
    }
  }

  async function checkStatus() {
    if (!payment || checking) return;
    setChecking(true);
    setError("");
    try {
      const response = await fetch(`/api/contributions/${payment.intentId}/status`, { cache: "no-store" });
      const result = await response.json();
      if (result.ok) {
        setPayment({
          intentId: payment.intentId,
          paymentStatus: result.paymentStatus ?? result.status ?? "unknown",
          message: result.message ?? statusLabel(result.paymentStatus ?? result.status ?? "unknown"),
        });
        if (result.status === "succeeded" || result.paymentStatus === "succeeded") router.refresh();
      } else {
        setError(result.error ?? "Could not check this contribution.");
      }
    } catch {
      setError("Could not reach Akiba to check the contribution. The request remains unconfirmed.");
    } finally {
      setChecking(false);
    }
  }

  const terminal = payment && ["succeeded", "failed", "cancelled", "expired"].includes(payment.paymentStatus);
  const isSuccessful = payment?.paymentStatus === "succeeded";

  return (
    <section className="ak-workspace-card ak-finance-contribute">
      <div className="ak-workspace-card-heading">
        <div><span className="ak-section-eyebrow">CONTRIBUTE TO THIS GROUP</span><h2>M-Pesa contribution</h2><p>Enter the amount and phone number that should receive the STK prompt.</p></div>
        <span className="ak-finance-provider-mark">M-Pesa</span>
      </div>

      {!groupActive ? (
        <div className="ak-finance-disabled"><strong>This group has been deactivated</strong><p>New contributions and withdrawals are disabled. Historical financial records remain available during the retention period.</p></div>
      ) : !leadershipReady ? (
        <div className="ak-finance-disabled"><strong>Group leadership is not yet established</strong><p>The Group Creator must appoint the required {requiredGroupAdmins} active Group Admins before anyone can contribute. No payment request has been started.</p></div>
      ) : !enabled ? (
        <div className="ak-finance-disabled"><strong>M-Pesa sandbox collection is not enabled here</strong><p>This contribution form is available only on the configured KES sandbox Preview deployment. No live payment option is enabled.</p></div>
      ) : payment ? (
        <div className="ak-finance-payment-state" aria-live="polite">
          <span className={`ak-finance-status-icon ${isSuccessful ? "success" : terminal ? "terminal" : "pending"}`}>{isSuccessful ? "✓" : terminal ? "!" : "…"}</span>
          <div>
            <strong>{statusLabel(payment.paymentStatus)}</strong>
            <p>{payment.message}</p>
            <small>Contribution reference: {payment.intentId}</small>
          </div>
          {!terminal && (
            <button type="button" className="ak-finance-secondary-button" onClick={checkStatus} disabled={checking}>
              {checking ? "Checking…" : "Check payment status"}
            </button>
          )}
          {terminal && <p className="ak-finance-final-note">{isSuccessful ? "The confirmed contribution is included in the group ledger." : "This attempt did not add money to the group balance."}</p>}
        </div>
      ) : (
        <form className="ak-finance-form" onSubmit={submitContribution}>
          <label htmlFor="ak-finance-amount">Amount ({currencyCode})</label>
          <div className="ak-finance-input-wrap"><span>{currencyCode}</span><input id="ak-finance-amount" inputMode="numeric" type="number" min="1" max="250000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
          <label htmlFor="ak-finance-phone">M-Pesa phone number</label>
          <input id="ak-finance-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required />
          <p className="ak-finance-helper">A Safaricom STK prompt will be sent to this number. You authorize any payment only on your phone.</p>
          <button className="ak-finance-primary-button" type="submit" disabled={submitting}>{submitting ? "Requesting prompt…" : "Contribute via M-Pesa"}</button>
        </form>
      )}

      {error && <p className="ak-finance-error" role="alert">{error}</p>}
      <div className="ak-finance-safety-note"><strong>Payment safety</strong><p>Akiba never asks for your M-Pesa PIN. Never share it in chat or enter it anywhere except the official M-Pesa prompt on your phone. Only provider-confirmed payments are added to group funds.</p></div>
    </section>
  );
}
