export interface RecoveryEventEvidence {
  payload_digest?: string | null;
  provider_result_code?: string | null;
  provider_receipt_number?: string | null;
}

export interface ContributionEvidence {
  callbackResultCode: string | null;
  providerResultCode: string | null;
  receipt: string | null;
  amountMinor: number;
  expectedAmountMinor: number;
  eventCurrency: string | null;
  attemptCurrency: string | null;
}

/** Safaricom M-Pesa receipt identifiers are ten alphanumeric characters. */
export function normalizeMpesaReceipt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(normalized) ? normalized : null;
}

/** A recovery placeholder contains no authenticated callback result or receipt. */
export function isMissingCallbackPlaceholder(event: RecoveryEventEvidence): boolean {
  return typeof event.payload_digest === "string" &&
    event.payload_digest.startsWith("callback-missing:") &&
    !event.provider_result_code &&
    !event.provider_receipt_number;
}

/** Provider success alone is insufficient: callback receipt and exact KES facts are mandatory. */
export function hasPostableContributionEvidence(evidence: ContributionEvidence): boolean {
  return evidence.callbackResultCode === "0" &&
    evidence.providerResultCode === "0" &&
    typeof evidence.receipt === "string" &&
    /^[A-Z0-9]{10}$/.test(evidence.receipt) &&
    Number.isSafeInteger(evidence.amountMinor) &&
    Number.isSafeInteger(evidence.expectedAmountMinor) &&
    evidence.amountMinor > 0 &&
    evidence.amountMinor === evidence.expectedAmountMinor &&
    evidence.eventCurrency === "KES" &&
    evidence.attemptCurrency === "KES";
}

export function isRetryableDarajaHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
