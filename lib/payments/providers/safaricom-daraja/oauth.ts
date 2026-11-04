import { PaymentError } from "../../errors";
import type { ProviderConnectionConfig } from "../../types";

interface DarajaOAuthResponse {
  access_token?: unknown;
  expires_in?: unknown;
  error_description?: unknown;
}

export interface DarajaAccessToken {
  accessToken: string;
  expiresInSeconds: number | null;
}

export async function getDarajaAccessToken(
  config: ProviderConnectionConfig,
): Promise<DarajaAccessToken> {
  const consumerKey = config.credentials.consumerKey;
  const consumerSecret = config.credentials.consumerSecret;

  if (
    config.environment !== "sandbox" ||
    !consumerKey ||
    !consumerSecret
  ) {
    throw new PaymentError(
      "PROVIDER_CONFIGURATION_INVALID",
      "Daraja sandbox credentials are not configured correctly.",
    );
  }

  let response: Response;
  try {
    const credentials = Buffer.from(
      consumerKey + ":" + consumerSecret,
    ).toString("base64");

    response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: "Basic " + credentials,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new PaymentError(
      "PROVIDER_UNAVAILABLE",
      timedOut
        ? "Safaricom OAuth request timed out."
        : "Could not reach Safaricom OAuth.",
      { retryable: true, cause: error },
    );
  }

  const result = (await response.json().catch(() => null)) as
    | DarajaOAuthResponse
    | null;

  if (!response.ok) {
    const providerMessage =
      typeof result?.error_description === "string"
        ? result.error_description
        : "Safaricom did not accept the OAuth request.";

    throw new PaymentError(
      "PROVIDER_AUTHENTICATION_FAILED",
      providerMessage,
      { retryable: response.status >= 500 },
    );
  }

  if (
    typeof result?.access_token !== "string" ||
    result.access_token.length === 0
  ) {
    throw new PaymentError(
      "PROVIDER_AUTHENTICATION_FAILED",
      "Safaricom returned an unexpected OAuth response.",
    );
  }

  const parsedExpiry =
    typeof result.expires_in === "string"
      ? Number.parseInt(result.expires_in, 10)
      : typeof result.expires_in === "number"
        ? result.expires_in
        : Number.NaN;

  return {
    accessToken: result.access_token,
    expiresInSeconds: Number.isFinite(parsedExpiry) ? parsedExpiry : null,
  };
}
