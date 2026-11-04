import { PaymentError } from "../../errors";
import type {
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from "../../types";
import type { PaymentProviderAdapter } from "../../provider-interface";
import { getDarajaAccessToken } from "./oauth";
import { createStkPush, queryStkPush } from "./stk";

const capabilities = Object.freeze({
  collection: true,
  payout: false,
  statusInquiry: true,
  callbacks: true,
  refunds: false,
  reversals: false,
  feeQuotes: false,
  splitSettlement: false,
  reconciliationExports: false,
  idempotency: true,
});

export const safaricomDarajaAdapter: PaymentProviderAdapter = {
  code: "safaricom_daraja",
  displayName: "M-Pesa",
  capabilities,

  async checkConnection(config: ProviderConnectionConfig): Promise<ProviderConnectionResult> {
    try {
      const token = await getDarajaAccessToken(config);
      return {
        ok: true,
        providerCode: "safaricom_daraja",
        environment: config.environment,
        authenticated: true,
        tokenExpiresInSeconds: token.expiresInSeconds,
      };
    } catch (error) {
      return {
        ok: false,
        providerCode: "safaricom_daraja",
        environment: config.environment,
        authenticated: false,
        error: error instanceof PaymentError
          ? error.message
          : "Could not complete the Daraja connection check.",
      };
    }
  },

  async createCollection(request, config) {
    if (request.currencyCode !== "KES" || request.amountMinor % BigInt(100) !== BigInt(0)) {
      throw new PaymentError(
        "INVALID_AMOUNT",
        "M-Pesa STK Push accepts whole Kenyan shillings only.",
      );
    }
    const result = await createStkPush(
      {
        amountKes: Number(request.amountMinor / BigInt(100)),
        phoneNumber: request.phoneNumber,
        accountReference: request.accountReference.slice(0, 12),
        transactionDescription: "Akiba",
      },
      config,
    );
    return {
      providerRequestReference: result.checkoutRequestId,
      providerMerchantReference: result.merchantRequestId,
      customerMessage: result.customerMessage ?? undefined,
    };
  },

  async queryCollection(requestReference, config) {
    const result = await queryStkPush(requestReference, config);
    let status: "pending" | "succeeded" | "failed" | "cancelled" | "unknown" = "unknown";
    if (result.resultCode === "0") status = "succeeded";
    else if (result.resultCode === "1032") status = "cancelled";
    else if (result.resultCode !== null) status = "failed";
    return { status, providerRequestReference: result.checkoutRequestId };
  },
};
