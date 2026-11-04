import { PaymentError } from "../../errors";
import type {
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from "../../types";
import type { PaymentProviderAdapter } from "../../provider-interface";
import { getDarajaAccessToken } from "./oauth";

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

  async checkConnection(
    config: ProviderConnectionConfig,
  ): Promise<ProviderConnectionResult> {
    try {
      const token = await getDarajaAccessToken(config);
      // The token is deliberately discarded and never returned or logged.
      return {
        ok: true,
        providerCode: "safaricom_daraja",
        environment: config.environment,
        authenticated: true,
        tokenExpiresInSeconds: token.expiresInSeconds,
      };
    } catch (error) {
      if (error instanceof PaymentError) {
        return {
          ok: false,
          providerCode: "safaricom_daraja",
          environment: config.environment,
          authenticated: false,
          error: error.message,
        };
      }

      return {
        ok: false,
        providerCode: "safaricom_daraja",
        environment: config.environment,
        authenticated: false,
        error: "Could not complete the Daraja connection check.",
      };
    }
  },
};
