import { PaymentError } from "../../errors";
import type { ProviderConnectionConfig } from "../../types";
import { getDarajaAccessToken } from "./oauth";

interface DarajaResponse {
  ResponseCode?: unknown;
  ResponseDescription?: unknown;
  MerchantRequestID?: unknown;
  CheckoutRequestID?: unknown;
  CustomerMessage?: unknown;
  ResultCode?: unknown;
  ResultDesc?: unknown;
}

type ProviderErrorDiagnostics = {
  errorCode?: string;
  requestId?: string;
  errorType?: string;
};

function safeDiagnosticValue(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 96) {
    return undefined;
  }
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : undefined;
}

function getProviderErrorDiagnostics(value: unknown): ProviderErrorDiagnostics {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const body = value as Record<string, unknown>;
  const nestedError =
    body.error && typeof body.error === "object" && !Array.isArray(body.error)
      ? (body.error as Record<string, unknown>)
      : {};

  const errorCode =
    safeDiagnosticValue(body.errorCode) ??
    safeDiagnosticValue(body.error_code) ??
    safeDiagnosticValue(body.code) ??
    safeDiagnosticValue(nestedError.errorCode) ??
    safeDiagnosticValue(nestedError.error_code) ??
    safeDiagnosticValue(nestedError.code);

  const requestId =
    safeDiagnosticValue(body.requestId) ??
    safeDiagnosticValue(body.request_id) ??
    safeDiagnosticValue(nestedError.requestId) ??
    safeDiagnosticValue(nestedError.request_id);

  const errorType =
    safeDiagnosticValue(body.errorType) ??
    safeDiagnosticValue(body.error_type) ??
    safeDiagnosticValue(nestedError.errorType) ??
    safeDiagnosticValue(nestedError.error_type);

  return {
    ...(errorCode ? { errorCode } : {}),
    ...(requestId ? { requestId } : {}),
    ...(errorType ? { errorType } : {}),
  };
}

function getTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  return values.year + values.month + values.day + values.hour + values.minute + values.second;
}

function getPassword(shortCode: string, passkey: string, timestamp: string): string {
  return Buffer.from(shortCode + passkey + timestamp).toString("base64");
}

async function darajaPost(
  path: string,
  body: Record<string, string | number>,
  config: ProviderConnectionConfig,
): Promise<DarajaResponse> {
  const token = await getDarajaAccessToken(config);
  let response: Response;
  try {
    response = await fetch("https://sandbox.safaricom.co.ke" + path, {
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
    console.error("[payments][daraja] Provider request could not be reached", {
      path,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    throw new PaymentError(
      "PROVIDER_UNAVAILABLE",
      "Safaricom could not be reached. The payment outcome may be unknown; do not submit another request yet.",
      { retryable: true, cause: error },
    );
  }

  const result = (await response.json().catch(() => null)) as DarajaResponse | null;
  if (!response.ok || !result) {
    console.error("[payments][daraja] Provider API returned an unsuccessful response", {
      path,
      httpStatus: response.status,
      responseBodyPresent: Boolean(result),
      responseContentType: response.headers.get("content-type") ?? "unknown",
      ...getProviderErrorDiagnostics(result),
    });
    throw new PaymentError(
      "PROVIDER_UNAVAILABLE",
      "Safaricom returned an unsuccessful response.",
      { retryable: response.status >= 500 },
    );
  }
  return result;
}

export interface StkPushInput {
  amountKes: number;
  phoneNumber: string;
  accountReference: string;
  transactionDescription: string;
}

export interface StkPushAccepted {
  merchantRequestId: string;
  checkoutRequestId: string;
  customerMessage: string | null;
}

export async function createStkPush(
  input: StkPushInput,
  config: ProviderConnectionConfig,
): Promise<StkPushAccepted> {
  const credentials = config.credentials;
  const shortCode = credentials.businessShortCode;
  const timestamp = getTimestamp();
  const response = await darajaPost(
    "/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: shortCode,
      Password: getPassword(shortCode, credentials.passkey, timestamp),
      Timestamp: timestamp,
      TransactionType: credentials.transactionType,
      Amount: input.amountKes,
      PartyA: input.phoneNumber,
      PartyB: shortCode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: credentials.callbackUrl,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: input.transactionDescription.slice(0, 13),
    },
    config,
  );

  if (
    String(response.ResponseCode) !== "0" ||
    typeof response.MerchantRequestID !== "string" ||
    typeof response.CheckoutRequestID !== "string"
  ) {
    throw new PaymentError(
      "PROVIDER_REQUEST_REJECTED",
      typeof response.ResponseDescription === "string"
        ? response.ResponseDescription
        : "Safaricom did not accept the STK Push request.",
    );
  }

  return {
    merchantRequestId: response.MerchantRequestID,
    checkoutRequestId: response.CheckoutRequestID,
    customerMessage:
      typeof response.CustomerMessage === "string" ? response.CustomerMessage : null,
  };
}

export interface StkQueryResult {
  checkoutRequestId: string;
  merchantRequestId: string | null;
  resultCode: string | null;
  resultDescription: string | null;
}

export async function queryStkPush(
  checkoutRequestId: string,
  config: ProviderConnectionConfig,
): Promise<StkQueryResult> {
  const credentials = config.credentials;
  const shortCode = credentials.businessShortCode;
  const timestamp = getTimestamp();
  const response = await darajaPost(
    "/mpesa/stkpushquery/v1/query",
    {
      BusinessShortCode: shortCode,
      Password: getPassword(shortCode, credentials.passkey, timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    config,
  );

  return {
    checkoutRequestId:
      typeof response.CheckoutRequestID === "string"
        ? response.CheckoutRequestID
        : checkoutRequestId,
    merchantRequestId:
      typeof response.MerchantRequestID === "string"
        ? response.MerchantRequestID
        : null,
    resultCode:
      response.ResultCode === undefined || response.ResultCode === null
        ? null
        : String(response.ResultCode),
    resultDescription:
      typeof response.ResultDesc === "string" ? response.ResultDesc : null,
  };
}
