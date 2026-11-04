export type PaymentErrorCode =
  | "INVALID_AMOUNT"
  | "INVALID_CURRENCY"
  | "INVALID_IDEMPOTENCY_KEY"
  | "IDEMPOTENCY_KEY_REUSED"
  | "GROUP_NOT_FOUND"
  | "GROUP_CURRENCY_MISMATCH"
  | "CONTRIBUTOR_NOT_ACTIVE"
  | "PROVIDER_NOT_AVAILABLE"
  | "PROVIDER_COLLECTION_UNSUPPORTED"
  | "PROVIDER_CONFIGURATION_INVALID"
  | "PROVIDER_AUTHENTICATION_FAILED"
  | "PROVIDER_UNAVAILABLE"
  | "CONTRIBUTION_CREATION_FAILED";

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly retryable: boolean;

  constructor(
    code: PaymentErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "PaymentError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
