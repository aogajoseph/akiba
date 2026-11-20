import { describe, expect, it } from "vitest";
import {
  createContributionIntent,
  type ContributionIntentRepository,
} from "../../lib/payments/orchestration/create-contribution";
import type {
  ContributionIntent,
  CreateContributionInput,
  ProviderCapabilities,
} from "../../lib/payments/types";

const capabilities: ProviderCapabilities = {
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
};

const input: CreateContributionInput = {
  groupId: "group-1",
  contributorId: "member-1",
  providerCode: "safaricom_daraja",
  currencyCode: "KES",
  amountMinor: 15000n,
  idempotencyKey: "contribution-key-1",
};

function intent(overrides: Partial<ContributionIntent> = {}): ContributionIntent {
  return {
    id: "intent-1",
    groupId: input.groupId,
    contributorId: input.contributorId,
    providerCode: input.providerCode,
    currencyCode: input.currencyCode,
    amountMinor: input.amountMinor,
    status: "created",
    idempotencyKey: input.idempotencyKey,
    createdAt: "2026-11-20T00:00:00.000Z",
    ...overrides,
  };
}

function repository(overrides: Partial<ContributionIntentRepository> = {}): ContributionIntentRepository {
  return {
    isActiveGroupMember: async () => true,
    getGroupCurrency: async () => "KES",
    findByIdempotencyKey: async () => null,
    getProvider: async () => ({
      code: "safaricom_daraja",
      isEnabled: true,
      capabilities,
    }),
    createIntent: async () => ({ kind: "created", intent: intent() }),
    ...overrides,
  };
}

describe("createContributionIntent", () => {
  it("allows an active member to create a contribution when the provider supports collection", async () => {
    const result = await createContributionIntent(input, repository());
    expect(result).toEqual({ intent: intent(), created: true });
  });

  it("rejects inactive members before creating an intent", async () => {
    const createIntent = async () => ({ kind: "created" as const, intent: intent() });
    await expect(createContributionIntent(input, repository({
      isActiveGroupMember: async () => false,
      createIntent,
    }))).rejects.toMatchObject({ code: "CONTRIBUTOR_NOT_ACTIVE" });
  });

  it("requires a real group and matching group currency", async () => {
    await expect(createContributionIntent(input, repository({
      getGroupCurrency: async () => null,
    }))).rejects.toMatchObject({ code: "GROUP_NOT_FOUND" });

    await expect(createContributionIntent(input, repository({
      getGroupCurrency: async () => "USD",
    }))).rejects.toMatchObject({ code: "GROUP_CURRENCY_MISMATCH" });
  });

  it("rejects disabled providers and providers without collection capability", async () => {
    await expect(createContributionIntent(input, repository({
      getProvider: async () => ({ code: "safaricom_daraja", isEnabled: false, capabilities }),
    }))).rejects.toMatchObject({ code: "PROVIDER_NOT_AVAILABLE" });

    await expect(createContributionIntent(input, repository({
      getProvider: async () => ({
        code: "safaricom_daraja",
        isEnabled: true,
        capabilities: { ...capabilities, collection: false },
      }),
    }))).rejects.toMatchObject({ code: "PROVIDER_COLLECTION_UNSUPPORTED" });
  });

  it("returns the existing intent for an exact idempotent retry", async () => {
    const existing = intent();
    const result = await createContributionIntent(input, repository({
      findByIdempotencyKey: async () => existing,
    }));
    expect(result).toEqual({ intent: existing, created: false });
  });

  it("rejects reuse of an idempotency key with different contribution terms", async () => {
    await expect(createContributionIntent(
      { ...input, amountMinor: 20000n },
      repository({ findByIdempotencyKey: async () => intent() }),
    )).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("recovers safely from a concurrent idempotency-key insert race", async () => {
    const existing = intent();
    const result = await createContributionIntent(input, repository({
      createIntent: async () => ({ kind: "idempotency_conflict" }),
      findByIdempotencyKey: async () => existing,
    }));
    expect(result).toEqual({ intent: existing, created: false });
  });

  it("fails when a concurrent insert conflict cannot be resolved", async () => {
    await expect(createContributionIntent(input, repository({
      createIntent: async () => ({ kind: "idempotency_conflict" }),
      findByIdempotencyKey: async () => null,
    }))).rejects.toMatchObject({ code: "CONTRIBUTION_CREATION_FAILED" });
  });
});
