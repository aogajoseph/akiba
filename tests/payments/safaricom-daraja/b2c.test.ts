import { describe, expect, it } from "vitest";
import {
  b2cCallbackMatchesAttempt,
  parseB2CResultEvidence,
  readDarajaB2CPayoutConfig,
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
