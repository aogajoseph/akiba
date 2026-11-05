import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readDarajaCollectionConfig } from "@/lib/payments/providers/safaricom-daraja/config";
import { queryStkPush } from "@/lib/payments/providers/safaricom-daraja/stk";
import { PaymentError } from "@/lib/payments/errors";
import { hasPostableCallbackEvidence, hasPostableContributionEvidence, reconciliationRetryDelayMinutes } from "@/lib/payments/providers/safaricom-daraja/reconciliation";

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
  const delayMinutes = reconciliationRetryDelayMinutes(attemptCount);
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

/**
 * Reconcile callback facts that were durably recorded but could not be
 * durably recorded by the callback endpoint or discovered as missing.
 *
 * This endpoint is intended for a trusted scheduler. Complete authenticated
 * success callbacks are posted from their validated receipt/amount evidence;
 * STK Query is reserved for missing or non-success callback reconciliation.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ ok: false, error: "Not authorized" }, 401);

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

  // Discover provider attempts whose callback never arrived. The placeholder
  // is intentionally missing result code, amount, currency and receipt, so it
  // can trigger provider status checks but can never satisfy posting criteria.
  const recoveryCutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  let discoveredMissingCallbacks = 0;
  let discoveryOffset = 0;
  const discoveryPageSize = 100;
  let discoveryComplete = false;

  // Page through the complete stale-attempt set. A fixed first-page limit
  // would permanently starve newer attempts whenever the oldest 100 already
  // had callback events.
  while (!discoveryComplete && discoveredMissingCallbacks < BATCH_SIZE) {
    const { data: staleAttempts, error: staleAttemptsError } = await service
      .from("akiba_payment_attempts")
      .select("id,provider_attempt_ref,provider_merchant_ref")
      .eq("provider_id", provider.id)
      .eq("status", "pending")
      .not("provider_attempt_ref", "is", null)
      .not("submitted_at", "is", null)
      .lt("submitted_at", recoveryCutoff)
      .order("submitted_at", { ascending: true })
      .order("id", { ascending: true })
      .range(discoveryOffset, discoveryOffset + discoveryPageSize - 1);

    if (staleAttemptsError) {
      console.error("[payments][daraja][reconcile] Stale-attempt discovery failed");
      break;
    }
    const page = staleAttempts ?? [];
    if (page.length < discoveryPageSize) discoveryComplete = true;
    discoveryOffset += page.length;
    if (!page.length) break;

    const candidateRefs = page
      .map((attempt) => attempt.provider_attempt_ref)
      .filter((reference): reference is string => Boolean(reference));
    const { data: existingEvents, error: existingEventsError } = candidateRefs.length
      ? await service
          .from("akiba_provider_events")
          .select("provider_event_ref")
          .eq("provider_id", provider.id)
          .in("provider_event_ref", candidateRefs)
      : { data: [], error: null };

    if (existingEventsError) {
      console.error("[payments][daraja][reconcile] Existing recovery-event lookup failed");
      break;
    }

    const existingRefs = new Set((existingEvents ?? []).map((event) => event.provider_event_ref));
    const missingAttempts = page
      .filter((attempt) => attempt.provider_attempt_ref && !existingRefs.has(attempt.provider_attempt_ref))
      .slice(0, BATCH_SIZE - discoveredMissingCallbacks);

    for (const staleAttempt of missingAttempts) {
      if (!staleAttempt.provider_attempt_ref) continue;
      const { error: placeholderError } = await service
        .from("akiba_provider_events")
        .upsert({
          provider_id: provider.id,
          provider_event_ref: staleAttempt.provider_attempt_ref,
          event_type: "mpesa_stk_callback",
          source_reference: staleAttempt.provider_merchant_ref,
          payload_digest: `callback-missing:${staleAttempt.provider_attempt_ref}`,
          provider_result_code: null,
          amount_minor: null,
          currency_code: null,
          provider_receipt_number: null,
          retryable: true,
          attempt_count: 0,
          next_retry_at: now,
          processing_status: "received",
          processing_note: "Awaiting authenticated callback receipt details; discovered from a stale pending attempt.",
        }, { onConflict: "provider_id,provider_event_ref", ignoreDuplicates: true });
      if (!placeholderError) discoveredMissingCallbacks += 1;
      else console.error("[payments][daraja][reconcile] Could not create missing-callback recovery record");
    }
  }

  const { data: dueEvents, error: eventsError } = await service
    .from("akiba_provider_events")
    .select("id,provider_event_ref,source_reference,payload_digest,provider_result_code,amount_minor,currency_code,provider_receipt_number,attempt_count")
    .eq("provider_id", provider.id)
    .eq("event_type", "mpesa_stk_callback")
    .eq("retryable", true)
    .is("processed_at", null)
    .in("processing_status", ["received", "failed", "processing"])
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
        next_retry_at: new Date(Date.now() + 2 * 60_000).toISOString(),
      })
      .eq("id", event.id)
      .eq("payload_digest", event.payload_digest)
      .eq("retryable", true)
      .is("processed_at", null)
      .in("processing_status", ["received", "failed", "processing"])
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
      }).eq("id", event.id).eq("payload_digest", event.payload_digest);
      manualReview += 1;
      continue;
    }

    if (
      event.source_reference &&
      attempt.provider_merchant_ref &&
      event.source_reference !== attempt.provider_merchant_ref
    ) {
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: false,
        processing_note: "Stored callback merchant reference did not match the payment attempt; manual review required.",
      }).eq("id", event.id).eq("payload_digest", event.payload_digest);
      manualReview += 1;
      continue;
    }

    try {
      // Complete authenticated success callbacks are self-contained payment
      // evidence. Post them before considering STK Query, so Daraja query
      // throttling/outages cannot block a valid callback from reaching the
      // ledger. The database RPC is atomic and idempotent.
      if (event.provider_result_code === "0") {
        const callbackEvidenceIsValid = hasPostableCallbackEvidence({
          callbackResultCode: event.provider_result_code,
          providerResultCode: event.provider_result_code,
          receipt: event.provider_receipt_number,
          amountMinor: Number(event.amount_minor),
          expectedAmountMinor: Number(attempt.amount_minor),
          eventCurrency: event.currency_code,
          attemptCurrency: attempt.currency_code,
        });

        if (!callbackEvidenceIsValid) {
          await service.from("akiba_provider_events").update({
            processing_status: "failed",
            retryable: false,
            processing_note: "Success callback is missing a valid receipt or its amount/currency does not match the stored attempt; manual review required.",
          }).eq("id", event.id).eq("payload_digest", event.payload_digest);
          manualReview += 1;
          continue;
        }

        const { data: currentCallback, error: currentCallbackError } = await service
          .from("akiba_provider_events")
          .select("id")
          .eq("id", event.id)
          .eq("payload_digest", event.payload_digest)
          .eq("processing_status", "processing")
          .eq("retryable", true)
          .is("processed_at", null)
          .maybeSingle();
        if (currentCallbackError || !currentCallback) {
          skipped += 1;
          continue;
        }

        const { error: callbackPostError } = await service.rpc("post_mpesa_contribution", {
          p_checkout_request_id: event.provider_event_ref,
          p_provider_receipt_number: event.provider_receipt_number,
          p_amount_minor: String(Number(event.amount_minor)),
          p_currency_code: "KES",
          p_provider_result_code: "0",
        });
        if (callbackPostError) throw callbackPostError;

        await service.from("akiba_provider_events").update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          retryable: false,
          processing_note: null,
        }).eq("id", event.id).eq("payload_digest", event.payload_digest);
        processed += 1;
        continue;
      }

      const configResult = readDarajaCollectionConfig();
      if (!configResult.ok) {
        throw new PaymentError("PROVIDER_UNAVAILABLE", "Provider configuration unavailable", { retryable: true });
      }
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
        }).eq("id", event.id).eq("payload_digest", event.payload_digest);
        manualReview += 1;
        continue;
      }

      const callbackCode = event.provider_result_code;

      // Provider query success without an authenticated callback receipt is
      // not sufficient evidence to post. Keep the event recoverable so a late
      // callback can supply the receipt and exact amount/currency facts.
      if (callbackCode === null && providerStatus.resultCode === "0") {
        const exhausted = nextAttempt >= MAX_ATTEMPTS;
        await service.from("akiba_provider_events").update({
          processing_status: "failed",
          retryable: !exhausted,
          next_retry_at: retryAt(nextAttempt),
          processing_note: exhausted
            ? "Safaricom reports success but the authenticated callback receipt is still missing; manual review required. A late callback can reopen this recovery record."
            : "Safaricom reports success, but the authenticated callback receipt is still missing; waiting for callback details.",
        }).eq("id", event.id).eq("payload_digest", event.payload_digest).is("provider_result_code", null);
        // A callback may have arrived while the provider query was in flight.
        // In that case the conditional update affects no row; the next worker
        // pass will process the newly persisted callback facts.
        if (exhausted) manualReview += 1;
        else deferred += 1;
        continue;
      }

      if (callbackCode === "0" && providerStatus.resultCode === "0") {
        const amountMinor = Number(event.amount_minor);
        const expectedMinor = Number(attempt.amount_minor);
        const receipt = typeof event.provider_receipt_number === "string"
          ? event.provider_receipt_number
          : "";

        if (!hasPostableContributionEvidence({
          callbackResultCode: callbackCode,
          providerResultCode: providerStatus.resultCode,
          receipt,
          amountMinor,
          expectedAmountMinor: expectedMinor,
          eventCurrency: event.currency_code,
          attemptCurrency: attempt.currency_code,
        })) {
          await service.from("akiba_provider_events").update({
            processing_status: "failed",
            retryable: false,
            processing_note: "Stored callback amount, currency, or receipt did not match the verified payment; manual review required.",
          }).eq("id", event.id).eq("payload_digest", event.payload_digest);
          manualReview += 1;
          continue;
        }

        // Callback enrichment may replace the event facts while the
        // provider query is in flight. Re-check the version immediately
        // before the irreversible ledger RPC; stale workers must not post
        // from an older callback snapshot.
        const { data: currentEvent, error: currentEventError } = await service
          .from("akiba_provider_events")
          .select("id")
          .eq("id", event.id)
          .eq("payload_digest", event.payload_digest)
          .eq("processing_status", "processing")
          .eq("retryable", true)
          .is("processed_at", null)
          .maybeSingle();
        if (currentEventError || !currentEvent) {
          skipped += 1;
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
        }).eq("id", event.id).eq("payload_digest", event.payload_digest);
        processed += 1;
        continue;
      }

      if (
        callbackCode !== null &&
        callbackCode !== "0" &&
        providerStatus.resultCode !== null &&
        providerStatus.resultCode !== "0"
      ) {
        // Do not update the attempt or intent from stale callback facts if a
        // newer authenticated callback arrived while STK Query was running.
        const { data: currentFailureEvent, error: currentFailureEventError } = await service
          .from("akiba_provider_events")
          .select("id")
          .eq("id", event.id)
          .eq("payload_digest", event.payload_digest)
          .eq("processing_status", "processing")
          .eq("retryable", true)
          .is("processed_at", null)
          .maybeSingle();
        if (currentFailureEventError || !currentFailureEvent) {
          skipped += 1;
          continue;
        }

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
        }).eq("id", event.id).eq("payload_digest", event.payload_digest);
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
        }).eq("id", event.id).eq("payload_digest", event.payload_digest);
        manualReview += 1;
        continue;
      }

      const exhausted = nextAttempt >= MAX_ATTEMPTS;
      const retryUpdate = service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: !exhausted,
        next_retry_at: retryAt(nextAttempt),
        processing_note: exhausted
          ? "Reconciliation retry limit reached; manual review required."
          : "Safaricom has not returned a matching final status; retry scheduled.",
      }).eq("id", event.id).eq("payload_digest", event.payload_digest);
      if (callbackCode === null) retryUpdate.is("provider_result_code", null);
      await retryUpdate;
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
      const failureUpdate = service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: shouldRetry,
        next_retry_at: retryAt(nextAttempt),
        processing_note: shouldRetry
          ? event.provider_result_code === "0"
            ? "Callback evidence validated but atomic ledger posting failed; retry scheduled."
            : "Provider verification failed; retry scheduled."
          : "Provider verification could not be completed; manual review required.",
      }).eq("id", event.id).eq("payload_digest", event.payload_digest);
      if (event.provider_result_code === null) failureUpdate.is("provider_result_code", null);
      await failureUpdate;
      if (shouldRetry) deferred += 1;
      else manualReview += 1;
    }
  }

  return json({
    ok: true,
    discoveredMissingCallbacks,
    scanned: dueEvents?.length ?? 0,
    processed,
    deferred,
    manualReview,
    skipped,
  });
}
