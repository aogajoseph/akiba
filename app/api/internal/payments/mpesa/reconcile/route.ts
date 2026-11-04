import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readDarajaCollectionConfig } from "@/lib/payments/providers/safaricom-daraja/config";
import { queryStkPush } from "@/lib/payments/providers/safaricom-daraja/stk";
import { PaymentError } from "@/lib/payments/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 3;
const MAX_ATTEMPTS = 12;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function retryAt(attemptCount: number): string {
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attemptCount - 1));
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

/**
 * Reconcile callback facts that were durably recorded but could not be
 * independently verified during the original callback request.
 *
 * This endpoint is intended for a trusted scheduler. It never accepts a
 * callback as proof of payment: every successful posting requires a fresh
 * Safaricom STK Query success and matching amount, currency and receipt.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ ok: false, error: "Not authorized" }, 401);

  const configResult = readDarajaCollectionConfig();
  if (!configResult.ok) {
    console.error("[payments][daraja][reconcile] Provider configuration unavailable");
    return json({ ok: false, error: "Provider configuration unavailable" }, 503);
  }

  const service = createServiceClient();
  const { data: provider, error: providerError } = await service
    .from("akiba_payment_providers")
    .select("id")
    .eq("provider_code", "safaricom_daraja")
    .single();

  if (providerError || !provider) {
    console.error("[payments][daraja][reconcile] Provider record unavailable", {
      databaseLookupFailed: Boolean(providerError),
    });
    return json({ ok: false, error: "Provider unavailable" }, 503);
  }

  const now = new Date().toISOString();
  const { data: dueEvents, error: eventsError } = await service
    .from("akiba_provider_events")
    .select("id,provider_event_ref,provider_result_code,amount_minor,currency_code,provider_receipt_number,attempt_count")
    .eq("provider_id", provider.id)
    .eq("event_type", "mpesa_stk_callback")
    .eq("retryable", true)
    .is("processed_at", null)
    .in("processing_status", ["received", "failed"])
    .lte("next_retry_at", now)
    .order("received_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (eventsError) {
    console.error("[payments][daraja][reconcile] Due-event lookup failed");
    return json({ ok: false, error: "Could not load reconciliation queue" }, 503);
  }

  let processed = 0;
  let deferred = 0;
  let manualReview = 0;
  let skipped = 0;

  for (const event of dueEvents ?? []) {
    const nextAttempt = Number(event.attempt_count ?? 0) + 1;
    // Conditional update is the claim operation. Concurrent workers cannot
    // both claim the same event because only one can move it out of a due state.
    const { data: claimed, error: claimError } = await service
      .from("akiba_provider_events")
      .update({
        processing_status: "processing",
        attempt_count: nextAttempt,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", event.id)
      .eq("retryable", true)
      .is("processed_at", null)
      .in("processing_status", ["received", "failed"])
      .lte("next_retry_at", now)
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      skipped += 1;
      continue;
    }

    const { data: attempt, error: attemptError } = await service
      .from("akiba_payment_attempts")
      .select("id,contribution_intent_id,amount_minor,currency_code,provider_merchant_ref")
      .eq("provider_id", provider.id)
      .eq("provider_attempt_ref", event.provider_event_ref)
      .maybeSingle();

    if (attemptError || !attempt) {
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: false,
        processing_note: "Stored callback no longer matches a payment attempt; manual review required.",
      }).eq("id", event.id);
      manualReview += 1;
      continue;
    }

    try {
      const providerStatus = await queryStkPush(event.provider_event_ref, configResult.config);
      if (
        providerStatus.checkoutRequestId !== event.provider_event_ref ||
        (providerStatus.merchantRequestId &&
          attempt.provider_merchant_ref &&
          providerStatus.merchantRequestId !== attempt.provider_merchant_ref)
      ) {
        await service.from("akiba_provider_events").update({
          processing_status: "failed",
          retryable: false,
          processing_note: "Provider response references did not match the stored attempt; manual review required.",
        }).eq("id", event.id);
        manualReview += 1;
        continue;
      }

      const callbackCode = event.provider_result_code;
      if (callbackCode === "0" && providerStatus.resultCode === "0") {
        const amountMinor = Number(event.amount_minor);
        const expectedMinor = Number(attempt.amount_minor);
        const receipt = typeof event.provider_receipt_number === "string"
          ? event.provider_receipt_number
          : "";

        if (
          !receipt ||
          !Number.isSafeInteger(amountMinor) ||
          amountMinor <= 0 ||
          amountMinor !== expectedMinor ||
          event.currency_code !== "KES" ||
          attempt.currency_code !== "KES"
        ) {
          await service.from("akiba_provider_events").update({
            processing_status: "failed",
            retryable: false,
            processing_note: "Stored callback amount, currency, or receipt did not match the verified payment; manual review required.",
          }).eq("id", event.id);
          manualReview += 1;
          continue;
        }

        const { error: postError } = await service.rpc("post_mpesa_contribution", {
          p_checkout_request_id: event.provider_event_ref,
          p_provider_receipt_number: receipt,
          p_amount_minor: String(amountMinor),
          p_currency_code: "KES",
          p_provider_result_code: "0",
        });
        if (postError) throw postError;

        await service.from("akiba_provider_events").update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          retryable: false,
          processing_note: null,
        }).eq("id", event.id);
        processed += 1;
        continue;
      }

      if (
        callbackCode !== null &&
        callbackCode !== "0" &&
        providerStatus.resultCode !== null &&
        providerStatus.resultCode !== "0"
      ) {
        const cancelled = callbackCode === "1032" || providerStatus.resultCode === "1032";
        const nextStatus = cancelled ? "cancelled" : "failed";
        await service.from("akiba_payment_attempts").update({
          status: nextStatus,
          response_code: providerStatus.resultCode,
          response_summary: (providerStatus.resultDescription || "M-Pesa payment failed.").slice(0, 500),
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", attempt.id);
        await service.from("akiba_contribution_intents").update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        }).eq("id", attempt.contribution_intent_id);
        await service.from("akiba_provider_events").update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          retryable: false,
          processing_note: null,
        }).eq("id", event.id);
        processed += 1;
        continue;
      }

      // A provider/callback disagreement is not safe to retry indefinitely or
      // to post. Keep the event visible for manual review.
      if (
        providerStatus.resultCode !== null &&
        callbackCode !== providerStatus.resultCode &&
        (providerStatus.resultCode === "0" || callbackCode === "0")
      ) {
        await service.from("akiba_provider_events").update({
          processing_status: "failed",
          retryable: false,
          processing_note: "Callback and provider final results disagree; manual review required.",
        }).eq("id", event.id);
        manualReview += 1;
        continue;
      }

      const exhausted = nextAttempt >= MAX_ATTEMPTS;
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: !exhausted,
        next_retry_at: retryAt(nextAttempt),
        processing_note: exhausted
          ? "Reconciliation retry limit reached; manual review required."
          : "Safaricom has not returned a matching final status; retry scheduled.",
      }).eq("id", event.id);
      if (exhausted) manualReview += 1;
      else deferred += 1;
    } catch (error) {
      const retryable = error instanceof PaymentError ? error.retryable : true;
      const exhausted = nextAttempt >= MAX_ATTEMPTS;
      const shouldRetry = retryable && !exhausted;
      console.error("[payments][daraja][reconcile] Event reconciliation failed", {
        providerEventId: event.id,
        checkoutRequestIdSuffix: event.provider_event_ref.slice(-6),
        errorCode: error instanceof PaymentError ? error.code : undefined,
        errorType: error instanceof PaymentError ? undefined : error instanceof Error ? error.name : typeof error,
        retryable: shouldRetry,
      });
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: shouldRetry,
        next_retry_at: retryAt(nextAttempt),
        processing_note: shouldRetry
          ? "Provider verification failed; retry scheduled."
          : "Provider verification could not be completed; manual review required.",
      }).eq("id", event.id);
      if (shouldRetry) deferred += 1;
      else manualReview += 1;
    }
  }

  return json({
    ok: true,
    scanned: dueEvents?.length ?? 0,
    processed,
    deferred,
    manualReview,
    skipped,
  });
}
