import type { PaymentProviderAdapter } from "./provider-interface";
import { safaricomDarajaAdapter } from "./providers/safaricom-daraja/adapter";

export const PAYMENT_PROVIDER_CODES = {
  SAFARICOM_DARAJA: "safaricom_daraja",
} as const;

const providers = {
  [PAYMENT_PROVIDER_CODES.SAFARICOM_DARAJA]: safaricomDarajaAdapter,
} satisfies Record<string, PaymentProviderAdapter>;

export function getPaymentProviderAdapter(
  providerCode: string,
): PaymentProviderAdapter | null {
  return providers[providerCode as keyof typeof providers] ?? null;
}

export function listPaymentProviderAdapters(): PaymentProviderAdapter[] {
  return Object.values(providers);
}
