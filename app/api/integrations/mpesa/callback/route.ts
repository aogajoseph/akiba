import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { callbackRefreshNextRetryAt, hasPostableCallbackEvidence, isMissingCallbackPlaceholder, normalizeMpesaReceipt, reconciliationRetryDelayMinutes } from "@/lib/payments/providers/safaricom-daraja/reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function validCallbackToken(received: string | null): boolean {
  const expected = process.env.MPESA_CALLBACK_TOKEN;
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

function callbackMetadata(items: unknown): Record<string, unknown> {
  if (!Array.isArray(items)) return {};
  const values: Record<string, unknown> = {};
  for (const entry of items) {
    if (
      entry &&
      typeof entry === "object" &&
      "Name" in entry &&
      typeof entry.Name === "string" &&
      "Value" in entry
    ) {
      values[entry.Name] = entry.Value;
    }
  }
  return values;
}

export async function POST(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get("token"))) {
    console.warn("[payments][daraja][callback] Callback authorization rejected", {
      tokenParameterPresent: request.nextUrl.searchParams.has("token"),
    });
    return json({ ResultCode: 1, ResultDesc: "Not authorized" }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 65536) return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);

  const rawBody = await request.text();
  if (rawBody.length > 65536) return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, 400);
  }

  const body = payload.Body as Record<string, unknown> | undefined;
  const callback = body?.stkCallback as Record<string, unknown> | undefined;
  const checkoutId = typeof callback?.CheckoutRequestID === "string" ? callback.CheckoutRequestID : "";
  const merchantId = typeof callback?.MerchantRequestID === "string" ? callback.MerchantRequestID : null;
  const callbackResultCode = callback?.ResultCode === undefined ? null : String(callback.ResultCode);
  const callbackDescription = typeof callback?.ResultDesc === "string" ? callback.ResultDesc.slice(0, 500) : null;
  const metadata = callbackMetadata(
    callback?.CallbackMetadata && typeof callback.CallbackMetadata === "object"
      ? (callback.CallbackMetadata as Record<string, unknown>).Item
      : null,
  );

  if (!checkoutId || callbackResultCode === null || !/^\d{1,4}$/.test(callbackResultCode)) {
    return json({ ResultCode: 1, ResultDesc: "Missing or invalid callback transaction reference" }, 400);
  }

  const amountKes = Number(metadata.Amount);
  const amountMinorCandidate = amountKes * 100;
  const amountMinor = Number.isSafeInteger(amountKes) && amountKes > 0 && Number.isSafeInteger(amountMinorCandidate)
    ? amountMinorCandidate
    : null;
  const receipt = normalizeMpesaReceipt(metadata.MpesaReceiptNumber);
  const digest = createHash("sha256").update(rawBody).digest("hex");

  console.info("[payments][daraja][callback] Authenticated callback received", {
    checkoutRequestIdSuffix: checkoutId.slice(-6),
    callbackResultCode,
    merchantRequestReferencePresent: merchantId !== null,
    callbackMetadataItemCount: Object.keys(metadata).length,
  });

  const service = createServiceClient();
  const { data: provider, error: providerError } = await service
    .from("akiba_payment_providers")
    .select("id")
    .eq("provider_code", "safaricom_daraja")
    .single();

  if (providerError || !provider) return json({ ResultCode: 1, ResultDesc: "Provider not registered" }, 503);

  const { data: attempt, error: attemptError } = await service
    .from("akiba_payment_attempts")
    .select("id,contribution_intent_id,amount_minor,currency_code,status,provider_attempt_ref,provider_merchant_ref")
    .eq("provider_id", provider.id)
    .eq("provider_attempt_ref", checkoutId)
    .maybeSingle();

  if (attemptError || !attempt) {
    console.warn("[payments][daraja][callback] Callback reference did not match a payment attempt", {
      checkoutRequestIdSuffix: checkoutId.slice(-6),
      databaseLookupFailed: Boolean(attemptError),
    });
    return json({ ResultCode: 1, ResultDesc: "Unknown payment reference" }, 404);
  }
  if (attempt.provider_merchant_ref && (!merchantId || merchantId !== attempt.provider_merchant_ref)) {
    return json({ ResultCode: 1, ResultDesc: "Merchant request reference mismatch" }, 409);
  }

  const eventValues = {
    provider_id: provider.id,
    provider_event_ref: checkoutId,
    event_type: "mpesa_stk_callback",
    source_reference: merchantId,
    payload_digest: digest,
    provider_result_code: callbackResultCode,
    amount_minor: amountMinor,
    currency_code: amountMinor === null ? null : "KES",
    provider_receipt_number: receipt,
    retryable: true,
    next_retry_at: new Date().toISOString(),
    processing_status: "received",
    processing_note: null,
  };

  const { data: insertedEvent, error: eventInsertError } = await service
    .from("akiba_provider_events")
    .insert(eventValues)
    .select("id")
    .maybeSingle();

  let eventId = insertedEvent?.id as string | undefined;
  if (eventInsertError?.code === "23505") {
    const { data: existingEvent, error: existingEventError } = await service
      .from("akiba_provider_events")
      .select("id,processing_status,retryable,payload_digest,provider_result_code,provider_receipt_number,next_retry_at")
      .eq("provider_id", provider.id)
      .eq("provider_event_ref", checkoutId)
      .single();

    if (existingEventError || !existingEvent) {
      return json({ ResultCode: 1, ResultDesc: "Could not load callback record" }, 503);
    }
    if (existingEvent.processing_status === "processed") {
      return json({ ResultCode: 0, ResultDesc: "Duplicate callback acknowledged" });
    }

    // A stale-attempt recovery placeholder is deliberately incomplete: it has
    // no callback result or receipt. A late authenticated callback must enrich
    // it even when the worker currently holds a processing lease or exhausted
    // its retries. Never reopen unrelated manual-review events.
    const isRecoveryPlaceholder = isMissingCallbackPlaceholder(existingEvent);
    const canRetry = existingEvent.retryable || isRecoveryPlaceholder;
    const nextProcessingStatus = existingEvent.processing_status === "processing"
      ? "processing"
      : canRetry
        ? "received"
        : existingEvent.processing_status;

    const { error: refreshError } = await service
      .from("akiba_provider_events")
      .update({
        ...eventValues,
        next_retry_at: callbackRefreshNextRetryAt(
          nextProcessingStatus,
          existingEvent.next_retry_at,
          eventValues.next_retry_at,
        ),
        processing_status: nextProcessingStatus,
        retryable: canRetry,
        processing_note: canRetry ? null : "Authenticated callback received; existing manual-review state retained.",
      })
      .eq("id", existingEvent.id);
    if (refreshError) return json({ ResultCode: 1, ResultDesc: "Could not refresh callback record" }, 503);
    eventId = existingEvent.id;
  } else if (eventInsertError) {
    return json({ ResultCode: 1, ResultDesc: "Could not record callback" }, 503);
  }

  if (!eventId) return json({ ResultCode: 1, ResultDesc: "Could not record callback" }, 503);

  console.info("[payments][daraja][callback] Callback durably recorded", {
    providerEventId: eventId,
    paymentAttemptId: attempt.id,
    checkoutRequestIdSuffix: checkoutId.slice(-6),
    callbackResultCode,
    callbackMetadataItemCount: Object.keys(metadata).length,
  });

  // A complete authenticated success callback is sufficient to post. The
  // posting RPC locks the attempt/intent and is idempotent, so a concurrent
  // worker or duplicate callback cannot create a second contribution.
  if (callbackResultCode === "0") {
    const postable = hasPostableCallbackEvidence({
      callbackResultCode,
      providerResultCode: callbackResultCode,
      receipt,
      amountMinor: amountMinor ?? 0,
      expectedAmountMinor: Number(attempt.amount_minor),
      eventCurrency: amountMinor === null ? null : "KES",
      attemptCurrency: attempt.currency_code,
    });

    if (!postable) {
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: false,
        processing_note: "Success callback is missing a valid receipt or its amount/currency does not match the stored attempt; manual review required.",
      }).eq("id", eventId).eq("payload_digest", digest);
      // The callback is safely stored. Acknowledge it so Safaricom does not
      // repeatedly deliver an event that Akiba has already retained.
      return json({ ResultCode: 0, ResultDesc: "Callback stored for manual payment review" });
    }

    const { error: postError } = await service.rpc("post_mpesa_contribution", {
      p_checkout_request_id: checkoutId,
      p_provider_receipt_number: receipt,
      p_amount_minor: String(amountMinor),
      p_currency_code: "KES",
      p_provider_result_code: "0",
    });

    if (postError) {
      const retryAt = new Date(Date.now() + reconciliationRetryDelayMinutes(1) * 60_000).toISOString();
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: true,
        attempt_count: 1,
        next_retry_at: retryAt,
        processing_note: "Valid success callback stored; ledger posting failed temporarily and will be retried without requiring STK Query.",
      }).eq("id", eventId).eq("payload_digest", digest);
      console.error("[payments][daraja][callback] Atomic contribution posting deferred", {
        providerEventId: eventId,
        checkoutRequestIdSuffix: checkoutId.slice(-6),
      });
      return json({ ResultCode: 0, ResultDesc: "Callback stored; contribution posting will be retried" });
    }

    const { error: processedError } = await service.from("akiba_provider_events").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      retryable: false,
      processing_note: null,
    }).eq("id", eventId).eq("payload_digest", digest);

    if (processedError) {
      // The financial RPC has already committed atomically. A later replay is
      // safe because the RPC returns the existing transaction for this receipt.
      console.error("[payments][daraja][callback] Contribution posted but callback event finalization failed", {
        providerEventId: eventId,
        checkoutRequestIdSuffix: checkoutId.slice(-6),
      });
    }
    return json({ ResultCode: 0, ResultDesc: "Contribution successfully recorded" });
  }

  // Non-success callbacks remain durably queued for the existing worker to
  // reconcile into failed/cancelled states. No group funds are credited.
  return json({ ResultCode: 0, ResultDesc: "Callback received and queued for reconciliation" });
}
