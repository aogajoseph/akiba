import type {
  ProviderConnectionConfig,
  ProviderEnvironment,
} from "../../types";

export type DarajaConfigResult =
  | { ok: true; config: ProviderConnectionConfig }
  | { ok: false; error: string };

export function readDarajaConfig(
  env: NodeJS.ProcessEnv = process.env,
): DarajaConfigResult {
  if (env.MPESA_ENVIRONMENT !== "sandbox") {
    return {
      ok: false,
      error: "M-Pesa is restricted to the Daraja sandbox in this release.",
    };
  }
  const consumerKey = env.MPESA_CONSUMER_KEY;
  const consumerSecret = env.MPESA_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    return {
      ok: false,
      error: "Daraja Consumer Key or Consumer Secret is not configured.",
    };
  }
  return {
    ok: true,
    config: {
      environment: "sandbox" as ProviderEnvironment,
      credentials: { consumerKey, consumerSecret },
    },
  };
}

export function readDarajaCollectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DarajaConfigResult {
  const base = readDarajaConfig(env);
  if (!base.ok) return base;

  const required: Record<string, string | undefined> = {
    businessShortCode: env.MPESA_BUSINESS_SHORT_CODE,
    passkey: env.MPESA_PASSKEY,
    callbackUrl: env.MPESA_CALLBACK_URL,
    callbackToken: env.MPESA_CALLBACK_TOKEN,
  };
  const missing = Object.entries(required).filter((entry) => !entry[1]);
  if (missing.length) {
    return {
      ok: false,
      error: "Daraja collection configuration is incomplete: " +
        missing.map((entry) => entry[0]).join(", ") + ".",
    };
  }

  let callbackUrl: URL;
  try {
    callbackUrl = new URL(required.callbackUrl as string);
  } catch {
    return { ok: false, error: "M-Pesa callback URL is invalid." };
  }
  if (callbackUrl.protocol !== "https:") {
    return { ok: false, error: "M-Pesa callback URL must use HTTPS." };
  }
  if (callbackUrl.searchParams.get("token") !== required.callbackToken) {
    return {
      ok: false,
      error: "M-Pesa callback URL must include the configured callback token query parameter.",
    };
  }

  const transactionType = env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline";
  if (
    transactionType !== "CustomerPayBillOnline" &&
    transactionType !== "CustomerBuyGoodsOnline"
  ) {
    return { ok: false, error: "Unsupported M-Pesa transaction type." };
  }

  return {
    ok: true,
    config: {
      environment: "sandbox",
      credentials: {
        ...base.config.credentials,
        businessShortCode: required.businessShortCode as string,
        passkey: required.passkey as string,
        callbackUrl: callbackUrl.toString(),
        transactionType,
      },
    },
  };
}
