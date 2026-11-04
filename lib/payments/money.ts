import { PaymentError } from "./errors";

export function assertPositiveMinorAmount(amountMinor: bigint): void {
  if (typeof amountMinor !== "bigint" || amountMinor <= 0n) {
    throw new PaymentError(
      "INVALID_AMOUNT",
      "Amount must be a positive integer in the currency's minor unit.",
    );
  }
}

export function assertCurrencyCode(currencyCode: string): void {
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new PaymentError(
      "INVALID_CURRENCY",
      "Currency must be a three-letter uppercase ISO currency code.",
    );
  }
}
