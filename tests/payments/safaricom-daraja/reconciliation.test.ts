import { describe, expect, it } from "vitest";
import {
  hasPostableContributionEvidence,
  isMissingCallbackPlaceholder,
  isRetryableDarajaHttpStatus,
  normalizeMpesaReceipt,
} from "../../../lib/payments/providers/safaricom-daraja/reconciliation";

describe("Safaricom callback evidence", () => {
  it("normalizes a valid ten-character receipt", () => {
    expect(normalizeMpesaReceipt("  ab12cd34ef ")).toBe("AB12CD34EF");
  });

  it.each([null, undefined, "", "ABC123", "ABCDEFGHIJK", "ABC-123456"])(
    "rejects an invalid receipt: %s",
    (receipt) => expect(normalizeMpesaReceipt(receipt)).toBeNull(),
  );

  it("recognizes only incomplete missing-callback placeholders", () => {
    expect(isMissingCallbackPlaceholder({
      payload_digest: "callback-missing:ws_CO_test",
      provider_result_code: null,
      provider_receipt_number: null,
    })).toBe(true);

    expect(isMissingCallbackPlaceholder({
      payload_digest: "callback-missing:ws_CO_test",
      provider_result_code: "0",
      provider_receipt_number: null,
    })).toBe(false);
  });

  const validEvidence = {
    callbackResultCode: "0",
    providerResultCode: "0",
    receipt: "AB12CD34EF",
    amountMinor: 100,
    expectedAmountMinor: 100,
    eventCurrency: "KES",
    attemptCurrency: "KES",
  };

  it("accepts a fully matching callback and provider success", () => {
    expect(hasPostableContributionEvidence(validEvidence)).toBe(true);
  });

  it("does not post on provider-query success without callback evidence", () => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      callbackResultCode: null,
    })).toBe(false);
  });

  it.each([
    { receipt: null },
    { receipt: "BAD" },
    { amountMinor: 99 },
    { eventCurrency: "USD" },
    { attemptCurrency: "USD" },
    { callbackResultCode: "1032" },
    { providerResultCode: "1" },
    { amountMinor: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects incomplete or mismatched evidence: %o", (override) => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      ...override,
    })).toBe(false);
  });
});

describe("Daraja retry classification", () => {
  it.each([408, 425, 429, 500, 502, 503])(
    "retries transient HTTP status %s",
    (status) => expect(isRetryableDarajaHttpStatus(status)).toBe(true),
  );

  it.each([400, 401, 403, 404])(
    "does not retry permanent HTTP status %s",
    (status) => expect(isRetryableDarajaHttpStatus(status)).toBe(false),
  );
});
