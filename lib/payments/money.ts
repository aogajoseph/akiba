import { PaymentError } from "./errors";

export function assertPositiveMinorAmount(amountMinor: bigint): void {
  // String validation avoids BigInt literal syntax, keeping this module
  // compatible with the repository's pre-ES2020 TypeScript target.
  if (
    typeof amountMinor !== "bigint" ||
    !/^[1-9]\d*$/.test(amountMinor.toString())
  ) {
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
