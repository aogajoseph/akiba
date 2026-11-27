import { describe, expect, it, vi } from "vitest";
import { createWithdrawalProviderRegistry } from "../../../lib/payments/withdrawals/registry";
import type { WithdrawalProviderAdapter } from "../../../lib/payments/withdrawals/types";

function adapter(providerCode: string, environment: "sandbox" | "production"): WithdrawalProviderAdapter {
  return {
    providerCode,
    environment,
    quoteWithdrawal: vi.fn(),
    submitWithdrawal: vi.fn(),
    verifyWithdrawal: vi.fn(),
    verifyCallback: vi.fn(),
  };
}

describe("withdrawal provider registry", () => {
  it("resolves adapters by both provider code and environment", () => {
    const sandbox = adapter("partner_one", "sandbox");
    const production = adapter("partner_one", "production");
    const registry = createWithdrawalProviderRegistry([sandbox, production]);

    expect(registry.get("partner_one", "sandbox")).toBe(sandbox);
    expect(registry.get("partner_one", "production")).toBe(production);
    expect(registry.get("partner_two", "sandbox")).toBeNull();
  });

  it("rejects duplicate provider/environment registrations", () => {
    expect(() => createWithdrawalProviderRegistry([
      adapter("partner_one", "sandbox"),
      adapter("partner_one", "sandbox"),
    ])).toThrow("Duplicate withdrawal provider adapter registration");
  });
});
