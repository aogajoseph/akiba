import { PaymentError } from "../errors";
import { assertCurrencyCode, assertPositiveMinorAmount } from "../money";
import type {
  ContributionIntent,
  CreateContributionInput,
  ProviderCapabilities,
} from "../types";

export interface ContributionProviderRecord {
  code: string;
  isEnabled: boolean;
  capabilities: ProviderCapabilities;
}

export type CreateIntentResult =
  | { kind: "created"; intent: ContributionIntent }
  | { kind: "idempotency_conflict" };

export interface ContributionIntentRepository {
  isActiveGroupMember(groupId: string, userId: string): Promise<boolean>;
  getGroupCurrency(groupId: string): Promise<string | null>;
  findByIdempotencyKey(
    groupId: string,
    contributorId: string,
    idempotencyKey: string,
  ): Promise<ContributionIntent | null>;
  getProvider(providerCode: string): Promise<ContributionProviderRecord | null>;
  /**
   * Must enforce the database unique key on
   * (group_id, contributor_id, idempotency_key) atomically.
   */
  createIntent(
    input: CreateContributionInput,
  ): Promise<CreateIntentResult>;
}

export interface CreateContributionResult {
  intent: ContributionIntent;
  created: boolean;
}

function assertIdempotentPayloadMatches(
  intent: ContributionIntent,
  input: CreateContributionInput,
): void {
  const matches =
    intent.groupId === input.groupId &&
    intent.contributorId === input.contributorId &&
    intent.providerCode === input.providerCode &&
    intent.currencyCode === input.currencyCode &&
    intent.amountMinor === input.amountMinor;

  if (!matches) {
    throw new PaymentError(
      "IDEMPOTENCY_KEY_REUSED",
      "This idempotency key was already used for a different contribution.",
    );
  }
}

export async function createContributionIntent(
  input: CreateContributionInput,
  repository: ContributionIntentRepository,
): Promise<CreateContributionResult> {
  if (!input.groupId.trim() || !input.contributorId.trim()) {
    throw new PaymentError(
      "CONTRIBUTION_CREATION_FAILED",
      "A group and contributor are required.",
    );
  }

  assertPositiveMinorAmount(input.amountMinor);
  assertCurrencyCode(input.currencyCode);

  if (
    input.idempotencyKey.trim().length < 8 ||
    input.idempotencyKey.trim().length > 160
  ) {
    throw new PaymentError(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency key must contain between 8 and 160 characters.",
    );
  }

  if (!(await repository.isActiveGroupMember(input.groupId, input.contributorId))) {
    throw new PaymentError(
      "CONTRIBUTOR_NOT_ACTIVE",
      "Only active group members can create contribution intents.",
    );
  }

  const groupCurrency = await repository.getGroupCurrency(input.groupId);
  if (!groupCurrency) {
    throw new PaymentError("GROUP_NOT_FOUND", "Group was not found.");
  }
  if (groupCurrency !== input.currencyCode) {
    throw new PaymentError(
      "GROUP_CURRENCY_MISMATCH",
      "Contribution currency must match the group's currency.",
    );
  }

  const existing = await repository.findByIdempotencyKey(
    input.groupId,
    input.contributorId,
    input.idempotencyKey,
  );

  if (existing) {
    assertIdempotentPayloadMatches(existing, input);
    return { intent: existing, created: false };
  }

  const provider = await repository.getProvider(input.providerCode);
  if (!provider?.isEnabled) {
    throw new PaymentError(
      "PROVIDER_NOT_AVAILABLE",
      "The selected payment provider is not currently available.",
    );
  }
  if (!provider.capabilities.collection) {
    throw new PaymentError(
      "PROVIDER_COLLECTION_UNSUPPORTED",
      "The selected provider does not support collections.",
    );
  }

  const created = await repository.createIntent(input);
  if (created.kind === "created") {
    return { intent: created.intent, created: true };
  }

  // A concurrent request may have won the unique-key race. Return that
  // canonical intent only if the second request has exactly the same payload.
  const racedIntent = await repository.findByIdempotencyKey(
    input.groupId,
    input.contributorId,
    input.idempotencyKey,
  );

  if (!racedIntent) {
    throw new PaymentError(
      "CONTRIBUTION_CREATION_FAILED",
      "The contribution could not be created. Please retry safely.",
      { retryable: true },
    );
  }

  assertIdempotentPayloadMatches(racedIntent, input);
  return { intent: racedIntent, created: false };
}
