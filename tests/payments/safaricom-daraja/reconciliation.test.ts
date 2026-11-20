import { describe, expect, it } from "vitest";
import {
  callbackRefreshNextRetryAt,
  hasPostableCallbackEvidence,
  hasPostableContributionEvidence,
  isMissingCallbackPlaceholder,
  isRetryableDarajaHttpStatus,
  normalizeMpesaReceipt,
  reconciliationRetryDelayMinutes,
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
    callbackCheckoutRequestId: "ws_CO_test_123",
    providerCheckoutRequestId: "ws_CO_test_123",
    callbackMerchantRequestId: "merchant_test",
    providerMerchantRequestId: "merchant_test",
    expectedMerchantRequestId: "merchant_test",
    receipt: "AB12CD34EF",
    amountMinor: 100,
    expectedAmountMinor: 100,
    eventCurrency: "KES",
    attemptCurrency: "KES",
  };

  it("accepts a fully matching callback and provider success", () => {
    expect(hasPostableContributionEvidence(validEvidence)).toBe(true);
  });

  it("validates callback facts independently but does not treat them as sufficient to post", () => {
    expect(hasPostableCallbackEvidence(validEvidence)).toBe(true);
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      providerCheckoutRequestId: null,
    })).toBe(false);
  });

  it("requires the callback and provider query to reference the same checkout request", () => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      providerCheckoutRequestId: "ws_CO_other",
    })).toBe(false);
  });

  it("rejects mismatched merchant references when the attempt has one", () => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      providerMerchantRequestId: "different_merchant",
    })).toBe(false);
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      callbackMerchantRequestId: "different_merchant",
    })).toBe(false);
  });

  it("allows provider query responses that omit the optional merchant reference", () => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      providerMerchantRequestId: null,
    })).toBe(true);
  });

  it("rejects callback/query merchant-reference disagreement even without an attempt merchant reference", () => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      expectedMerchantRequestId: null,
      callbackMerchantRequestId: "callback-merchant",
      providerMerchantRequestId: "query-merchant",
    })).toBe(false);
  });

  it("rejects a success callback with a missing receipt or mismatched amount", () => {
    expect(hasPostableCallbackEvidence({ ...validEvidence, receipt: null })).toBe(false);
    expect(hasPostableCallbackEvidence({ ...validEvidence, amountMinor: 99 })).toBe(false);
  });

  it("does not post on provider-query success without callback evidence", () => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      callbackResultCode: null,
    })).toBe(false);
  });

  it("does not post on callback success without an independent provider query", () => {
    expect(hasPostableContributionEvidence({
      ...validEvidence,
      providerResultCode: null,
      providerCheckoutRequestId: null,
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

describe("Daraja reconciliation retry backoff", () => {
  it.each([
    [1, 15],
    [2, 30],
    [3, 60],
    [4, 120],
    [5, 240],
    [6, 360],
    [12, 360],
    [0, 15],
  ])("backs off attempt %s for %s minutes", (attempt, expectedMinutes) => {
    expect(reconciliationRetryDelayMinutes(attempt)).toBe(expectedMinutes);
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

describe("callback enrichment lease handling", () => {
  it("preserves the active worker lease when enriching a processing event", () => {
    expect(callbackRefreshNextRetryAt(
      "processing",
      "2026-11-05T07:02:00.000Z",
      "2026-11-05T07:01:00.000Z",
    )).toBe("2026-11-05T07:02:00.000Z");
  });

  it("makes a non-processing event immediately due for reconciliation", () => {
    expect(callbackRefreshNextRetryAt(
      "failed",
      "2026-11-05T08:00:00.000Z",
      "2026-11-05T07:01:00.000Z",
    )).toBe("2026-11-05T07:01:00.000Z");
  });
});
