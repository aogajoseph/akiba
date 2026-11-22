import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentError } from "../../../lib/payments/errors";
import {
  b2cCallbackMatchesAttempt,
  classifyB2CSubmissionFailure,
  parseB2CResultEvidence,
  readDarajaB2CPayoutConfig,
  readDarajaB2CStatusConfig,
  queryB2CTransactionStatus,
  submitB2CPayout,
} from "../../../lib/payments/providers/safaricom-daraja/b2c";

const validEnv = {
  NODE_ENV: "test" as const,
  MPESA_ENVIRONMENT: "sandbox",
  MPESA_SANDBOX_PAYOUT_ENABLED: "true",
  MPESA_CONSUMER_KEY: "sandbox-key",
  MPESA_CONSUMER_SECRET: "sandbox-secret",
  MPESA_B2C_INITIATOR_NAME: "test-initiator",
  MPESA_B2C_SECURITY_CREDENTIAL: "encrypted-sandbox-credential",
  MPESA_B2C_SHORTCODE: "600000",
  MPESA_B2C_TEST_RECIPIENT_PHONE: "254700000001",
  MPESA_B2C_RESULT_URL: "https://example.test/api/integrations/mpesa/b2c/result?token=secret",
  MPESA_B2C_QUEUE_TIMEOUT_URL: "https://example.test/api/integrations/mpesa/b2c/timeout?token=secret",
  MPESA_B2C_CALLBACK_TOKEN: "secret",
};

describe("Daraja B2C sandbox configuration", () => {
  it("fails closed unless sandbox and explicit opt-in are both set", () => {
    expect(readDarajaB2CPayoutConfig({ ...validEnv, MPESA_ENVIRONMENT: "production" }).ok).toBe(false);
    expect(readDarajaB2CPayoutConfig({ ...validEnv, MPESA_SANDBOX_PAYOUT_ENABLED: "false" }).ok).toBe(false);
  });

  it("accepts complete HTTPS callback configuration with matching token", () => {
    const result = readDarajaB2CPayoutConfig(validEnv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.environment).toBe("sandbox");
  });

  it("allows read-only sandbox status inquiries while payout submission remains gated", () => {
    expect(readDarajaB2CPayoutConfig({ ...validEnv, MPESA_SANDBOX_PAYOUT_ENABLED: "false" }).ok).toBe(false);
    expect(readDarajaB2CStatusConfig({ ...validEnv, MPESA_SANDBOX_PAYOUT_ENABLED: "false" }).ok).toBe(true);
    expect(readDarajaB2CStatusConfig({ ...validEnv, MPESA_ENVIRONMENT: "production" }).ok).toBe(false);
  });

  it("requires a valid dedicated sandbox test recipient number", () => {
    expect(readDarajaB2CPayoutConfig({ ...validEnv, MPESA_B2C_TEST_RECIPIENT_PHONE: undefined }).ok).toBe(false);
    expect(readDarajaB2CPayoutConfig({ ...validEnv, MPESA_B2C_TEST_RECIPIENT_PHONE: "0712345678" }).ok).toBe(false);
    expect(readDarajaB2CPayoutConfig(validEnv).ok).toBe(true);
  });

  it("rejects callback URLs without HTTPS or the configured token", () => {
    expect(readDarajaB2CPayoutConfig({
      ...validEnv,
      MPESA_B2C_RESULT_URL: "http://example.test/result?token=secret",
    }).ok).toBe(false);
    expect(readDarajaB2CPayoutConfig({
      ...validEnv,
      MPESA_B2C_QUEUE_TIMEOUT_URL: "https://example.test/timeout?token=wrong",
    }).ok).toBe(false);
  });
});

describe("Daraja B2C submission destination", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("always sends to the dedicated server-side sandbox number, never a caller-supplied number", async () => {
    const parsed = readDarajaB2CPayoutConfig(validEnv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "sandbox-access-token",
        expires_in: "3599",
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ResponseCode: "0",
        OriginatorConversationID: "originator-123",
        ConversationID: "conversation-123",
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const accepted = await submitB2CPayout({
      amountKes: 100,
      requestReference: "AKIBA12345",
      remarks: "sandbox test",
      // Even an untyped/malicious caller cannot override the configured target.
      recipientPhone: "254711111111",
    } as never, parsed.config);

    expect(accepted.responseDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(accepted.originatorConversationId).toBe("originator-123");
    const submittedBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(submittedBody.PartyB).toBe("254700000001");
    expect(submittedBody.PartyB).not.toBe("254711111111");
  });
});

describe("Daraja B2C result evidence", () => {
  const payload = {
    Result: {
      ResultCode: 0,
      OriginatorConversationID: "originator-123",
      ConversationID: "conversation-123",
      TransactionID: "SG12345678",
      ResultParameters: {
        ResultParameter: [
          { Key: "TransactionAmount", Value: 150 },
          { Key: "TransactionReceipt", Value: "AB12CD34EF" },
        ],
      },
    },
  };

  it("extracts only the minimum facts required for later reconciliation", () => {
    const evidence = parseB2CResultEvidence(payload);
    expect(evidence).toMatchObject({
      originatorConversationId: "originator-123",
      conversationId: "conversation-123",
      transactionId: "SG12345678",
      resultCode: "0",
      amountKes: 150,
      receipt: "AB12CD34EF",
    });
    expect(evidence?.responseDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("requires callback references, amount, receipt and success to match the attempt", () => {
    const evidence = parseB2CResultEvidence(payload);
    expect(evidence).not.toBeNull();
    expect(b2cCallbackMatchesAttempt(evidence!, {
      originatorConversationId: "originator-123",
      conversationId: "conversation-123",
      amountKes: 150,
    })).toBe(true);
    expect(b2cCallbackMatchesAttempt(evidence!, {
      originatorConversationId: "different",
      conversationId: "conversation-123",
      amountKes: 150,
    })).toBe(false);
    expect(b2cCallbackMatchesAttempt(evidence!, {
      originatorConversationId: "originator-123",
      conversationId: "conversation-123",
      amountKes: 151,
    })).toBe(false);
  });

  it("does not treat an unsuccessful or incomplete callback as payout evidence", () => {
    expect(parseB2CResultEvidence({ Result: { ResultCode: 2001 } })?.receipt).toBeNull();
    expect(parseB2CResultEvidence(null)).toBeNull();
    expect(parseB2CResultEvidence({ Result: [] })).toBeNull();
  });
});


describe("Daraja B2C independent status inquiry", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the inquiry conversation references and digest without requiring payout opt-in", async () => {
    const parsed = readDarajaB2CStatusConfig({ ...validEnv, MPESA_SANDBOX_PAYOUT_ENABLED: "false" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "sandbox-access-token", expires_in: "3599",
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ResponseCode: "0",
        OriginatorConversationID: "status-originator-123",
        ConversationID: "status-conversation-123",
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await queryB2CTransactionStatus("SG12345678", parsed.config);
    expect(result).toMatchObject({
      responseCode: "0",
      originatorConversationId: "status-originator-123",
      conversationId: "status-conversation-123",
    });
    expect(result.responseDigest).toMatch(/^[a-f0-9]{64}$/);
  });
});


describe("Daraja B2C submission outcome classification", () => {
  it("marks OAuth failures as known not submitted", () => {
    expect(classifyB2CSubmissionFailure(new PaymentError("PROVIDER_AUTHENTICATION_FAILED", "OAuth failed", { submissionOutcome: "not_submitted" }))).toBe("not_submitted");
  });

  it("marks an explicit numeric provider rejection separately", () => {
    expect(classifyB2CSubmissionFailure(new PaymentError("PROVIDER_REQUEST_REJECTED", "Rejected", { submissionOutcome: "rejected" }))).toBe("rejected");
  });

  it("keeps transport and unclassified errors unknown", () => {
    expect(classifyB2CSubmissionFailure(new PaymentError("PROVIDER_UNAVAILABLE", "Timed out", { submissionOutcome: "unknown" }))).toBe("unknown");
    expect(classifyB2CSubmissionFailure(new Error("connection reset"))).toBe("unknown");
  });
});
