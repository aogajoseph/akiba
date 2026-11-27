import type { ProviderEnvironment } from "../types";

/**
 * Normalized contract between Akiba's provider-independent withdrawal
 * orchestration and a contracted payment partner.
 *
 * Implementations may call partner APIs and validate partner evidence only.
 * They must never write Akiba ledger rows, create/release reservations,
 * approve requests, or mark a withdrawal complete.
 */
export interface WithdrawalQuoteRequest {
  requestReference: string;
  recipientAmountMinor: bigint;
  currencyCode: string;
  /** Opaque, partner-issued destination token; never a raw bank/mobile-money secret. */
  destinationToken: string;
  destinationFingerprint: string;
}

export interface WithdrawalFeeQuote {
  providerCode: string;
  quoteReference: string;
  recipientAmountMinor: bigint;
  providerFeeMinor: bigint;
  currencyCode: string;
  feeScheduleVersion: string;
  expiresAt: string;
  /** Digest/reference for the raw partner response retained in secure evidence storage. */
  responseDigest: string;
}

export interface WithdrawalSubmissionRequest {
  withdrawalRequestId: string;
  /** Stable across retries of this exact partner instruction. */
  idempotencyKey: string;
  quoteReference: string;
  recipientAmountMinor: bigint;
  currencyCode: string;
  destinationToken: string;
  destinationFingerprint: string;
}

export interface WithdrawalSubmissionResult {
  providerCode: string;
  providerPayoutReference: string;
  status: "accepted" | "processing" | "unknown";
  acceptedAt: string | null;
  responseDigest: string;
}

export type ProviderWithdrawalStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "unknown";

export interface WithdrawalStatusEvidence {
  providerCode: string;
  providerPayoutReference: string;
  status: ProviderWithdrawalStatus;
  amountMinor: bigint | null;
  currencyCode: string | null;
  receiptReference: string | null;
  checkedAt: string;
  responseDigest: string;
}

export interface WithdrawalCallbackEvidence {
  providerCode: string;
  eventReference: string;
  providerPayoutReference: string;
  status: ProviderWithdrawalStatus;
  amountMinor: bigint | null;
  currencyCode: string | null;
  receiptReference: string | null;
  authenticated: boolean;
  responseDigest: string;
}

/**
 * One adapter per independently contracted provider/environment.
 * Quote and status evidence is normalized here; core orchestration performs
 * all authorization, state transitions, reservations and ledger posting.
 */
export interface WithdrawalProviderAdapter {
  readonly providerCode: string;
  readonly environment: ProviderEnvironment;

  quoteWithdrawal(request: WithdrawalQuoteRequest): Promise<WithdrawalFeeQuote>;

  submitWithdrawal(
    request: WithdrawalSubmissionRequest,
  ): Promise<WithdrawalSubmissionResult>;

  verifyWithdrawal(
    providerPayoutReference: string,
  ): Promise<WithdrawalStatusEvidence>;

  verifyCallback(
    payload: unknown,
    headers: Readonly<Record<string, string>>,
  ): Promise<WithdrawalCallbackEvidence>;
}

export interface WithdrawalProviderRegistry {
  get(
    providerCode: string,
    environment: ProviderEnvironment,
  ): WithdrawalProviderAdapter | null;
}
