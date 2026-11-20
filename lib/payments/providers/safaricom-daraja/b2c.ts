import { createHash } from "node:crypto";
import { PaymentError } from "../../errors";
import type { ProviderConnectionConfig } from "../../types";
import { getDarajaAccessToken } from "./oauth";

const B2C_ENDPOINT = "https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest";
const TRANSACTION_STATUS_ENDPOINT = "https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query";

export interface B2CPayoutConfig extends ProviderConnectionConfig {
  environment: "sandbox";
  credentials: Readonly<Record<string, string> & {
    consumerKey: string;
    consumerSecret: string;
    initiatorName: string;
    securityCredential: string;
    businessShortCode: string;
    resultUrl: string;
    queueTimeoutUrl: string;
    callbackToken: string;
  }>;
}

export type B2CConfigResult =
  | { ok: true; config: B2CPayoutConfig }
  | { ok: false; error: string };

function secureCallbackUrl(value: string | undefined, token: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.searchParams.get("token") !== token) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Explicit opt-in; this reader can never return a production configuration. */
export function readDarajaB2CPayoutConfig(
  env: NodeJS.ProcessEnv = process.env,
): B2CConfigResult {
  if (
    env.MPESA_ENVIRONMENT !== "sandbox" ||
    env.MPESA_SANDBOX_PAYOUT_ENABLED !== "true"
  ) {
    return { ok: false, error: "Safaricom B2C payouts are disabled; sandbox and explicit opt-in are required." };
  }

  const required = {
    consumerKey: env.MPESA_CONSUMER_KEY,
    consumerSecret: env.MPESA_CONSUMER_SECRET,
    initiatorName: env.MPESA_B2C_INITIATOR_NAME,
    securityCredential: env.MPESA_B2C_SECURITY_CREDENTIAL,
    businessShortCode: env.MPESA_B2C_SHORTCODE,
    callbackToken: env.MPESA_B2C_CALLBACK_TOKEN,
  };
  const missing = Object.entries(required).filter(([, value]) => !value);
  if (missing.length) {
    return { ok: false, error: "Daraja B2C configuration is incomplete: " + missing.map(([key]) => key).join(", ") + "." };
  }

  const resultUrl = secureCallbackUrl(env.MPESA_B2C_RESULT_URL, required.callbackToken as string);
  const queueTimeoutUrl = secureCallbackUrl(env.MPESA_B2C_QUEUE_TIMEOUT_URL, required.callbackToken as string);
  if (!resultUrl || !queueTimeoutUrl) {
    return { ok: false, error: "B2C ResultURL and QueueTimeOutURL must be HTTPS URLs containing the configured token query parameter." };
  }

  return {
    ok: true,
    config: {
      environment: "sandbox",
      credentials: required as Record<string, string> & {
        consumerKey: string; consumerSecret: string; initiatorName: string;
        securityCredential: string; businessShortCode: string; resultUrl: string;
        queueTimeoutUrl: string; callbackToken: string;
      },
    },
  };
}

export interface B2CPayoutRequest {
  amountKes: number;
  recipientPhone: string;
  requestReference: string;
  remarks: string;
  occasion?: string;
}

export interface B2CPayoutAccepted {
  originatorConversationId: string;
  conversationId: string | null;
  responseCode: string;
  responseDescription: string | null;
}

interface B2CSubmissionResponse {
  OriginatorConversationID?: unknown;
  ConversationID?: unknown;
  ResponseCode?: unknown;
  ResponseDescription?: unknown;
}

async function postDaraja(
  endpoint: string,
  body: Record<string, string | number>,
  config: B2CPayoutConfig,
): Promise<Record<string, unknown>> {
  const token = await getDarajaAccessToken(config);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token.accessToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new PaymentError(
      "PROVIDER_UNAVAILABLE",
      "Safaricom B2C could not be reached; the payout outcome may be unknown. Do not submit it again automatically.",
      { retryable: true, cause: error },
    );
  }
  const result = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !result) {
    throw new PaymentError(
      "PROVIDER_UNAVAILABLE",
      "Safaricom B2C returned an unsuccessful response.",
      { retryable: response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500 },
    );
  }
  return result;
}

export async function submitB2CPayout(
  input: B2CPayoutRequest,
  config: B2CPayoutConfig,
): Promise<B2CPayoutAccepted> {
  if (!Number.isSafeInteger(input.amountKes) || input.amountKes < 1 || input.amountKes > 250_000) {
    throw new PaymentError("INVALID_AMOUNT", "B2C sandbox payout amount must be a whole KES amount between 1 and 250,000.");
  }
  if (!/^254[17]\d{8}$/.test(input.recipientPhone)) {
    throw new PaymentError("INVALID_AMOUNT", "Recipient phone number must use the 2547XXXXXXXX or 2541XXXXXXXX format.");
  }
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(input.requestReference)) {
    throw new PaymentError("INVALID_AMOUNT", "Payout request reference must be 8–32 safe characters.");
  }

  const result = await postDaraja(B2C_ENDPOINT, {
    InitiatorName: config.credentials.initiatorName,
    SecurityCredential: config.credentials.securityCredential,
    CommandID: "BusinessPayment",
    Amount: input.amountKes,
    PartyA: config.credentials.businessShortCode,
    PartyB: input.recipientPhone,
    Remarks: input.remarks.slice(0, 100),
    QueueTimeOutURL: config.credentials.queueTimeoutUrl,
    ResultURL: config.credentials.resultUrl,
    Occasion: (input.occasion ?? "Akiba group payout").slice(0, 100),
  }, config) as B2CSubmissionResponse;

  if (String(result.ResponseCode) !== "0" || typeof result.OriginatorConversationID !== "string") {
    throw new PaymentError(
      "PROVIDER_REQUEST_REJECTED",
      typeof result.ResponseDescription === "string" ? result.ResponseDescription : "Safaricom did not accept the B2C request.",
    );
  }
  return {
    originatorConversationId: result.OriginatorConversationID,
    conversationId: typeof result.ConversationID === "string" ? result.ConversationID : null,
    responseCode: String(result.ResponseCode),
    responseDescription: typeof result.ResponseDescription === "string" ? result.ResponseDescription : null,
  };
}

export interface B2CResultEvidence {
  originatorConversationId: string | null;
  conversationId: string | null;
  transactionId: string | null;
  resultCode: string | null;
  amountKes: number | null;
  receipt: string | null;
  responseDigest: string;
}

/** Parse only the facts needed for matching; never treat this callback as final proof. */
export function parseB2CResultEvidence(payload: unknown): B2CResultEvidence | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const result = (payload as Record<string, unknown>).Result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const body = result as Record<string, unknown>;
  const parameters = body.ResultParameters as { ResultParameter?: Array<{ Key?: unknown; Value?: unknown }> } | undefined;
  const values = new Map((Array.isArray(parameters?.ResultParameter) ? parameters.ResultParameter : [])
    .filter((item) => typeof item?.Key === "string")
    .map((item) => [String(item.Key), item.Value]));
  const amount = Number(values.get("TransactionAmount"));
  const receiptValue = values.get("TransactionReceipt");
  return {
    originatorConversationId: typeof body.OriginatorConversationID === "string" ? body.OriginatorConversationID : null,
    conversationId: typeof body.ConversationID === "string" ? body.ConversationID : null,
    transactionId: typeof body.TransactionID === "string" ? body.TransactionID : null,
    resultCode: body.ResultCode === undefined || body.ResultCode === null ? null : String(body.ResultCode),
    amountKes: Number.isSafeInteger(amount) && amount > 0 ? amount : null,
    receipt: typeof receiptValue === "string" && /^[A-Z0-9]{10}$/.test(receiptValue) ? receiptValue : null,
    responseDigest: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
}

export function b2cCallbackMatchesAttempt(
  evidence: B2CResultEvidence,
  expected: { originatorConversationId: string; conversationId?: string | null; amountKes: number },
): boolean {
  return evidence.resultCode === "0" &&
    evidence.originatorConversationId === expected.originatorConversationId &&
    (!expected.conversationId || evidence.conversationId === expected.conversationId) &&
    evidence.amountKes === expected.amountKes &&
    Boolean(evidence.transactionId && evidence.receipt);
}

/** Independent transaction-status inquiry; callback data alone never completes a payout. */
export async function queryB2CTransactionStatus(
  transactionId: string,
  config: B2CPayoutConfig,
): Promise<{ responseDigest: string; response: Record<string, unknown> }> {
  if (!/^[A-Z0-9]{8,20}$/.test(transactionId)) {
    throw new PaymentError("INVALID_AMOUNT", "A valid Safaricom transaction ID is required for status verification.");
  }
  const response = await postDaraja(TRANSACTION_STATUS_ENDPOINT, {
    Initiator: config.credentials.initiatorName,
    SecurityCredential: config.credentials.securityCredential,
    CommandID: "TransactionStatusQuery",
    TransactionID: transactionId,
    PartyA: config.credentials.businessShortCode,
    IdentifierType: 4,
    ResultURL: config.credentials.resultUrl,
    QueueTimeOutURL: config.credentials.queueTimeoutUrl,
    Remarks: "Akiba sandbox payout verification",
    Occasion: "Reconciliation",
  }, config);
  return {
    responseDigest: createHash("sha256").update(JSON.stringify(response)).digest("hex"),
    response,
  };
}
