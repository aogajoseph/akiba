export interface RecoveryEventEvidence {
  payload_digest?: string | null;
  provider_result_code?: string | null;
  provider_receipt_number?: string | null;
}

export interface CallbackEvidence {
  callbackResultCode: string | null;
  providerResultCode: string | null;
  receipt: string | null;
  amountMinor: number;
  expectedAmountMinor: number;
  eventCurrency: string | null;
  attemptCurrency: string | null;
}

export interface ContributionEvidence extends CallbackEvidence {
  callbackCheckoutRequestId: string | null;
  providerCheckoutRequestId: string | null;
  callbackMerchantRequestId: string | null;
  providerMerchantRequestId: string | null;
  expectedMerchantRequestId: string | null;
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

/** A success callback is postable only when its own facts match the stored attempt. */
export function hasPostableCallbackEvidence(evidence: CallbackEvidence): boolean {
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

/**
 * Posting requires both the authenticated callback and an independent
 * successful STK Query response for the same checkout request. The query
 * endpoint does not return receipt/amount, so those callback facts are
 * checked against the immutable attempt/intent separately.
 */
export function hasPostableContributionEvidence(evidence: ContributionEvidence): boolean {
  if (!hasPostableCallbackEvidence(evidence)) return false;
  if (
    !evidence.callbackCheckoutRequestId ||
    evidence.callbackCheckoutRequestId !== evidence.providerCheckoutRequestId
  ) return false;
  if (
    evidence.expectedMerchantRequestId &&
    evidence.callbackMerchantRequestId !== evidence.expectedMerchantRequestId
  ) return false;
  if (
    evidence.expectedMerchantRequestId &&
    evidence.providerMerchantRequestId &&
    evidence.providerMerchantRequestId !== evidence.expectedMerchantRequestId
  ) return false;
  return true;
}

export function isRetryableDarajaHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * Back off provider verification to avoid repeatedly querying a transaction
 * while Daraja is returning transient failures or rate limits.
 * Attempts wait 15m, 30m, 60m, 120m, 240m, then at most 6h.
 */
export function reconciliationRetryDelayMinutes(attemptCount: number): number {
  const safeAttempt = Number.isFinite(attemptCount)
    ? Math.max(1, Math.floor(attemptCount))
    : 1;
  return Math.min(360, 15 * 2 ** (safeAttempt - 1));
}

/** Preserve an active worker lease when an authenticated callback enriches its event. */
export function callbackRefreshNextRetryAt(
  processingStatus: string,
  existingNextRetryAt: string | null,
  now: string,
): string {
  return processingStatus === "processing" && existingNextRetryAt
    ? existingNextRetryAt
    : now;
}
