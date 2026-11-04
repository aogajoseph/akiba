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

  const required: Record<string, string | undefined> = {
    consumerKey: env.MPESA_CONSUMER_KEY,
    consumerSecret: env.MPESA_CONSUMER_SECRET,
    businessShortCode: env.MPESA_BUSINESS_SHORT_CODE,
    passkey: env.MPESA_PASSKEY,
    callbackUrl: env.MPESA_CALLBACK_URL,
  };
  const missing = Object.entries(required).filter((entry) => !entry[1]);
  if (missing.length) {
    return {
      ok: false,
      error: "Daraja sandbox configuration is incomplete: " +
        missing.map((entry) => entry[0]).join(", ") + ".",
    };
  }

  const callbackUrl = new URL(required.callbackUrl as string);
  if (callbackUrl.protocol !== "https:") {
    return { ok: false, error: "M-Pesa callback URL must use HTTPS." };
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
      environment: "sandbox" as ProviderEnvironment,
      credentials: {
        consumerKey: required.consumerKey as string,
        consumerSecret: required.consumerSecret as string,
        businessShortCode: required.businessShortCode as string,
        passkey: required.passkey as string,
        callbackUrl: callbackUrl.toString(),
        transactionType,
      },
    },
  };
}
