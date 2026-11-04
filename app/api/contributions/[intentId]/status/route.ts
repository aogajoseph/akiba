import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readDarajaCollectionConfig } from "@/lib/payments/providers/safaricom-daraja/config";
import { queryStkPush } from "@/lib/payments/providers/safaricom-daraja/stk";
import { PaymentError } from "@/lib/payments/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ intentId: string }> },
) {
  const userClient = await createUserClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ ok: false, error: "Sign in to check this contribution." }, 401);

  const { intentId } = await context.params;
  const service = createServiceClient();
  const { data: intent, error: intentError } = await service
    .from("akiba_contribution_intents")
    .select("id,contributor_id,status,currency_code,amount_minor")
    .eq("id", intentId)
    .eq("contributor_id", user.id)
    .maybeSingle();
  if (intentError || !intent) return json({ ok: false, error: "Contribution not found." }, 404);

  const { data: attempt, error: attemptError } = await service
    .from("akiba_payment_attempts")
    .select("id,status,provider_attempt_ref,provider_merchant_ref,updated_at")
    .eq("contribution_intent_id", intentId)
    .maybeSingle();
  if (attemptError || !attempt) return json({ ok: false, error: "Payment attempt not found." }, 404);

  if (["succeeded", "failed", "cancelled", "expired"].includes(intent.status)) {
    return json({ ok: true, status: intent.status, paymentStatus: attempt.status });
  }
  if (!attempt.provider_attempt_ref) {
    return json({
      ok: true,
      status: intent.status,
      paymentStatus: attempt.status,
      message: "The provider reference is not available yet. Do not create another payment attempt.",
    }, 202);
  }

  // Avoid repeatedly hitting Daraja when its sandbox status endpoint is
  // unavailable or a transaction is still settling. The timestamp is advanced
  // after every query attempt, including transport/provider errors.
  const lastCheckedAt = Date.parse(attempt.updated_at);
  const retryAfterMs = 15_000;
  if (Number.isFinite(lastCheckedAt) && Date.now() - lastCheckedAt < retryAfterMs) {
    return json({
      ok: true,
      status: intent.status,
      paymentStatus: "unknown",
      retryAfterSeconds: Math.ceil((retryAfterMs - (Date.now() - lastCheckedAt)) / 1000),
      message: "The provider was checked recently. Please wait before checking again; the contribution remains unposted.",
    }, 202);
  }

  const configResult = readDarajaCollectionConfig();
  if (!configResult.ok) return json({ ok: false, error: configResult.error }, 503);

  try {
    const result = await queryStkPush(attempt.provider_attempt_ref, configResult.config);
    await service.from("akiba_payment_attempts").update({
      updated_at: new Date().toISOString(),
    }).eq("id", attempt.id);
    if (result.resultCode === "1032") {
      await service.from("akiba_payment_attempts").update({
        status: "cancelled",
        response_code: result.resultCode,
        response_summary: result.resultDescription,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", attempt.id);
      await service.from("akiba_contribution_intents").update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      }).eq("id", intentId);
      return json({ ok: true, status: "cancelled", paymentStatus: "cancelled" });
    }
    if (result.resultCode !== null && result.resultCode !== "0") {
      await service.from("akiba_payment_attempts").update({
        status: "failed",
        response_code: result.resultCode,
        response_summary: result.resultDescription,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", attempt.id);
      await service.from("akiba_contribution_intents").update({
        status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", intentId);
      return json({ ok: true, status: "failed", paymentStatus: "failed" });
    }
    if (result.resultCode === "0") {
      return json({
        ok: true,
        status: intent.status,
        paymentStatus: "awaiting_callback_details",
        message: "Safaricom reports success. Akiba is waiting for the receipt details before posting group funds.",
      }, 202);
    }
    return json({
      ok: true,
      status: intent.status,
      paymentStatus: "pending",
      message: "Safaricom has not returned a final result yet.",
    }, 202);
  } catch (error) {
    // Keep provider diagnostics in server logs only. Never log credentials,
    // access tokens, callback URLs, phone numbers, or raw provider responses.
    const diagnostic = error instanceof PaymentError
      ? { errorCode: error.code, retryable: error.retryable }
      : { errorType: error instanceof Error ? error.name : typeof error };
    console.error("[payments][daraja][stk-query] Provider status query failed", {
      intentId,
      paymentAttemptId: attempt.id,
      checkoutRequestIdSuffix: attempt.provider_attempt_ref.slice(-6),
      ...diagnostic,
    });
    await service.from("akiba_payment_attempts").update({
      updated_at: new Date().toISOString(),
    }).eq("id", attempt.id);
    return json({
      ok: true,
      status: intent.status,
      paymentStatus: "unknown",
      message: "The provider status could not be checked. The contribution remains unposted.",
    }, 202);
  }
}
