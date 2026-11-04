export type ProviderEnvironment = "sandbox" | "production";

export interface ProviderConnectionConfig {
  environment: ProviderEnvironment;
  credentials: Readonly<Record<string, string>>;
}

export interface ProviderCapabilities {
  collection: boolean;
  payout: boolean;
  statusInquiry: boolean;
  callbacks: boolean;
  refunds: boolean;
  reversals: boolean;
  feeQuotes: boolean;
  splitSettlement: boolean;
  reconciliationExports: boolean;
  idempotency: boolean;
}

export interface ProviderConnectionResult {
  ok: boolean;
  providerCode: string;
  environment: ProviderEnvironment;
  authenticated: boolean;
  tokenExpiresInSeconds?: number | null;
  error?: string;
}

export type ContributionStatus =
  | "created"
  | "awaiting_authorization"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

export interface ContributionIntent {
  id: string;
  groupId: string;
  contributorId: string;
  providerCode: string;
  currencyCode: string;
  amountMinor: bigint;
  status: ContributionStatus;
  idempotencyKey: string;
  createdAt: string;
}

export interface CreateContributionInput {
  groupId: string;
  contributorId: string;
  providerCode: string;
  currencyCode: string;
  amountMinor: bigint;
  idempotencyKey: string;
}
