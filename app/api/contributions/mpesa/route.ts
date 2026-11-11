import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createContributionIntent } from "@/lib/payments/orchestration/create-contribution";
import { PaymentError } from "@/lib/payments/errors";
import { getPaymentProviderAdapter } from "@/lib/payments/registry";
import { readDarajaCollectionConfig } from "@/lib/payments/providers/safaricom-daraja/config";
import type {
  ContributionIntent,
  CreateContributionInput,
  ProviderCapabilities,
} from "@/lib/payments/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function normalizeKenyanPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^\d]/g, "");
  if (/^254[71]\d{8}$/.test(digits)) return digits;
  if (/^0[71]\d{8}$/.test(digits)) return "254" + digits.slice(1);
  if (/^[71]\d{8}$/.test(digits)) return "254" + digits;
  return null;
}

function mapIntent(row: Record<string, unknown>): ContributionIntent {
  return {
    id: String(row.id),
    groupId: String(row.group_id),
    contributorId: String(row.contributor_id),
    providerCode: "safaricom_daraja",
    currencyCode: String(row.currency_code),
    amountMinor: BigInt(String(row.amount_minor)),
    status: row.status as ContributionIntent["status"],
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at),
  };
}

export async function POST(request: NextRequest) {
  const userClient = await createUserClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ ok: false, error: "Sign in before contributing." }, 401);

  let body: Record<string, unknown>;
  try {
    const parsedBody: unknown = await request.json();
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return json({ ok: false, error: "Request body must be a JSON object." }, 400);
    }
    body = parsedBody as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Request body must be valid JSON." }, 400);
  }

  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const phoneNumber = normalizeKenyanPhone(body.phoneNumber);
  const amountText = typeof body.amountMinor === "string"
    ? body.amountMinor
    : typeof body.amountMinor === "number" && Number.isSafeInteger(body.amountMinor)
      ? String(body.amountMinor)
      : "";
  const idempotencyKey =
    request.headers.get("Idempotency-Key") ||
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey : "");

  if (!groupId || !phoneNumber || !/^[1-9]\d*$/.test(amountText)) {
    return json({
      ok: false,
      error: "Provide a group, a valid Kenyan M-Pesa phone number, and amountMinor as a positive integer.",
    }, 400);
  }
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    return json({ ok: false, error: "Provide a valid Idempotency-Key (8–160 characters)." }, 400);
  }

  let amountMinor: bigint;
  try {
    amountMinor = BigInt(amountText);
  } catch {
    return json({ ok: false, error: "Contribution amount is invalid." }, 400);
  }
  if (amountMinor % BigInt(100) !== BigInt(0)) {
    return json({ ok: false, error: "M-Pesa contributions must be whole Kenyan shillings." }, 400);
  }
  if (amountMinor / BigInt(100) > BigInt(250000)) {
    return json({ ok: false, error: "The sandbox contribution limit is 250,000 KES." }, 400);
  }

  if (
    process.env.MPESA_ENVIRONMENT !== "sandbox" ||
    process.env.MPESA_SANDBOX_COLLECTION_ENABLED !== "true"
  ) {
    return json({ ok: false, error: "M-Pesa sandbox collections are not enabled for this deployment." }, 503);
  }

  const configResult = readDarajaCollectionConfig();
  if (!configResult.ok) return json({ ok: false, error: configResult.error }, 503);
  const adapter = getPaymentProviderAdapter("safaricom_daraja");
  if (!adapter?.createCollection) {
    return json({ ok: false, error: "M-Pesa collection is not configured." }, 503);
  }

  const service = createServiceClient();
  const input: CreateContributionInput = {
    groupId,
    contributorId: user.id,
    providerCode: "safaricom_daraja",
    currencyCode: "KES",
    amountMinor,
    idempotencyKey,
  };

  const repository = {
    async isActiveGroupMember(targetGroupId: string, userId: string) {
      const { data, error } = await service
        .from("akiba_group_memberships")
        .select("id")
        .eq("group_id", targetGroupId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    async getGroupCurrency(targetGroupId: string) {
      const { data, error } = await service
        .from("akiba_groups")
        .select("currency_code")
        .eq("id", targetGroupId)
        .maybeSingle();
      if (error) throw error;
      return data?.currency_code ?? null;
    },
    async findByIdempotencyKey(targetGroupId: string, contributorId: string, key: string) {
      const { data, error } = await service
        .from("akiba_contribution_intents")
        .select("*")
        .eq("group_id", targetGroupId)
        .eq("contributor_id", contributorId)
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) throw error;
      return data ? mapIntent(data) : null;
    },
    async getProvider(providerCode: string) {
      const { data, error } = await service
        .from("akiba_payment_providers")
        .select("provider_code,is_enabled,capabilities")
        .eq("provider_code", providerCode)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const sandboxOptIn =
        process.env.MPESA_ENVIRONMENT === "sandbox" &&
        process.env.MPESA_SANDBOX_COLLECTION_ENABLED === "true";
      return {
        code: data.provider_code,
        isEnabled: data.is_enabled || sandboxOptIn,
        capabilities: data.capabilities as ProviderCapabilities,
      };
    },
    async createIntent(createInput: CreateContributionInput) {
      const { data: provider, error: providerError } = await service
        .from("akiba_payment_providers")
        .select("id")
        .eq("provider_code", createInput.providerCode)
        .single();
      if (providerError || !provider) throw providerError ?? new Error("Payment provider not found.");
      const { data, error } = await service
        .from("akiba_contribution_intents")
        .insert({
          group_id: createInput.groupId,
          contributor_id: createInput.contributorId,
          provider_id: provider.id,
          currency_code: createInput.currencyCode,
          amount_minor: createInput.amountMinor.toString(),
          akiba_fee_minor: "0",
          status: "created",
          idempotency_key: createInput.idempotencyKey,
        })
        .select("*")
        .single();
      if (error?.code === "23505") return { kind: "idempotency_conflict" as const };
      if (error || !data) throw error ?? new Error("Could not create contribution intent.");
      return { kind: "created" as const, intent: mapIntent(data) };
    },
  };

  try {
    const result = await createContributionIntent(input, repository);
    const intent = result.intent;

    const { data: existingAttempt, error: attemptLookupError } = await service
      .from("akiba_payment_attempts")
      .select("id,status,provider_attempt_ref,provider_merchant_ref,response_summary")
      .eq("contribution_intent_id", intent.id)
      .maybeSingle();
    if (attemptLookupError) throw attemptLookupError;

    if (existingAttempt) {
      return json({
        ok: true,
        created: false,
        intentId: intent.id,
        status: intent.status,
        paymentStatus: existingAttempt.status,
        checkoutRequestId: existingAttempt.provider_attempt_ref,
        message: "This idempotency key already has a payment attempt. No second STK prompt was sent.",
      }, 200);
    }

    const { data: provider, error: providerError } = await service
      .from("akiba_payment_providers")
      .select("id")
      .eq("provider_code", "safaricom_daraja")
      .single();
    if (providerError || !provider) throw providerError ?? new Error("M-Pesa provider is not registered.");

    const requestReference = "akiba-" + randomUUID();
    const { data: attempt, error: attemptError } = await service
      .from("akiba_payment_attempts")
      .insert({
        contribution_intent_id: intent.id,
        provider_id: provider.id,
        amount_minor: amountMinor.toString(),
        currency_code: "KES",
        request_reference: requestReference,
        status: "initiated",
      })
      .select("id")
      .single();
    if (attemptError?.code === "23505") {
      const { data: racedAttempt } = await service
        .from("akiba_payment_attempts")
        .select("id,status,provider_attempt_ref")
        .eq("contribution_intent_id", intent.id)
        .maybeSingle();
      return json({
        ok: true,
        created: false,
        intentId: intent.id,
        paymentStatus: racedAttempt?.status ?? "unknown",
        checkoutRequestId: racedAttempt?.provider_attempt_ref ?? null,
        message: "A payment attempt already exists for this contribution. No additional STK prompt was sent.",
      }, 200);
    }
    if (attemptError || !attempt) throw attemptError ?? new Error("Could not create payment attempt.");

    await service
      .from("akiba_contribution_intents")
      .update({ status: "awaiting_authorization", updated_at: new Date().toISOString() })
      .eq("id", intent.id);

    try {
      const collection = await adapter.createCollection(
        {
          requestReference,
          amountMinor,
          currencyCode: "KES",
          phoneNumber,
          callbackUrl: configResult.config.credentials.callbackUrl,
          accountReference: "AK" + intent.id.replace(/-/g, "").slice(0, 10),
        },
        configResult.config,
      );

      const { error: saveAttemptError } = await service
        .from("akiba_payment_attempts")
        .update({
          provider_attempt_ref: collection.providerRequestReference,
          provider_merchant_ref: collection.providerMerchantReference ?? null,
          status: "pending",
          response_code: "0",
          response_summary: collection.customerMessage ?? "STK Push accepted by Safaricom.",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);
      if (saveAttemptError) {
        return json({
          ok: true,
          intentId: intent.id,
          paymentStatus: "unknown",
          message: "Safaricom accepted the request, but Akiba could not save its provider reference. Do not retry; contact support for reconciliation.",
        }, 202);
      }

      return json({
        ok: true,
        intentId: intent.id,
        paymentStatus: "pending",
        checkoutRequestId: collection.providerRequestReference,
        customerMessage: collection.customerMessage,
        message: "Check your phone and authorize the payment in the M-Pesa prompt. Akiba will update the contribution after provider confirmation.",
      }, 202);
    } catch (providerError) {
      const uncertain = providerError instanceof PaymentError &&
        providerError.code === "PROVIDER_UNAVAILABLE";
      await service
        .from("akiba_payment_attempts")
        .update({
          status: uncertain ? "unknown" : "failed",
          response_summary: providerError instanceof Error
            ? providerError.message.slice(0, 500)
            : "Provider request failed.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);
      await service
        .from("akiba_contribution_intents")
        .update({
          status: uncertain ? "processing" : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intent.id);

      return json({
        ok: false,
        intentId: intent.id,
        paymentStatus: uncertain ? "unknown" : "failed",
        error: uncertain
          ? "The provider request outcome is unknown. Do not submit a new request; check status or contact support."
          : providerError instanceof Error ? providerError.message : "M-Pesa rejected the request.",
      }, uncertain ? 202 : 502);
    }
  } catch (error) {
    const databaseMessage = error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
    if (databaseMessage.includes("Group leadership is incomplete")) {
      return json({
        ok: false,
        code: "GROUP_LEADERSHIP_INCOMPLETE",
        error: "This group must have its required Group Admins appointed before contributions can begin.",
      }, 409);
    }
    if (error instanceof PaymentError) {
      const status =
        error.code === "CONTRIBUTOR_NOT_ACTIVE" ? 403 :
        error.code === "GROUP_NOT_FOUND" ? 404 :
        error.code === "PROVIDER_NOT_AVAILABLE" ? 503 :
        error.code === "IDEMPOTENCY_KEY_REUSED" ? 409 : 400;
      return json({ ok: false, code: error.code, error: error.message }, status);
    }
    return json({ ok: false, error: "Could not create the contribution. Please retry with the same idempotency key." }, 500);
  }
}
