import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
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
  const receipt = typeof metadata.MpesaReceiptNumber === "string" ? metadata.MpesaReceiptNumber : null;
  const digest = createHash("sha256").update(rawBody).digest("hex");

  console.info("[payments][daraja][callback] Authenticated callback received", {
    checkoutRequestIdSuffix: checkoutId.slice(-6),
    callbackResultCode,
    merchantRequestReferencePresent: merchantId !== null,
    callbackMetadataItemCount: Object.keys(metadata).length,
  });

  const configResult = readDarajaCollectionConfig();
  if (!configResult.ok) return json({ ResultCode: 1, ResultDesc: "Provider configuration unavailable" }, 503);

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
  if (attempt.provider_merchant_ref && merchantId !== attempt.provider_merchant_ref) {
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
      .select("id,processing_status,retryable")
      .eq("provider_id", provider.id)
      .eq("provider_event_ref", checkoutId)
      .single();

    if (existingEventError || !existingEvent) {
      return json({ ResultCode: 1, ResultDesc: "Could not load callback record" }, 503);
    }
    if (existingEvent.processing_status === "processed") {
      return json({ ResultCode: 0, ResultDesc: "Duplicate callback acknowledged" });
    }
    if (existingEvent.processing_status === "processing") {
      return json({ ResultCode: 0, ResultDesc: "Callback is already being reconciled" }, 202);
    }
    if (!existingEvent.retryable) {
      return json({ ResultCode: 0, ResultDesc: "Callback is awaiting manual reconciliation" }, 202);
    }

    const { error: refreshError } = await service
      .from("akiba_provider_events")
      .update(eventValues)
      .eq("id", existingEvent.id)
      .in("processing_status", ["received", "failed"]);
    if (refreshError) return json({ ResultCode: 1, ResultDesc: "Could not refresh callback record" }, 503);
    eventId = existingEvent.id;
  } else if (eventInsertError) {
    return json({ ResultCode: 1, ResultDesc: "Could not record callback" }, 503);
  }

  if (!eventId) return json({ ResultCode: 1, ResultDesc: "Could not record callback" }, 503);

  console.info("[payments][daraja][callback] Callback accepted for reconciliation", {
    providerEventId: eventId,
    paymentAttemptId: attempt.id,
    checkoutRequestIdSuffix: checkoutId.slice(-6),
    callbackResultCode,
    callbackMetadataItemCount: Object.keys(metadata).length,
  });

  try {
    // Daraja callbacks are not cryptographically signed. A callback is stored
    // as evidence to reconcile, never as proof that money was received.
    const providerStatus = await queryStkPush(checkoutId, configResult.config);
    if (
      providerStatus.checkoutRequestId !== checkoutId ||
      (providerStatus.merchantRequestId &&
        attempt.provider_merchant_ref &&
        providerStatus.merchantRequestId !== attempt.provider_merchant_ref)
    ) {
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: false,
        processing_note: "Provider response references did not match the stored attempt; manual review required.",
      }).eq("id", eventId);
      return json({ ResultCode: 1, ResultDesc: "Payment reference requires manual reconciliation" }, 202);
    }

    if (callbackResultCode === "0" && providerStatus.resultCode === "0") {
      const expectedMinor = Number(attempt.amount_minor);
      if (
        !receipt ||
        amountMinor === null ||
        !Number.isSafeInteger(amountMinor) ||
        amountMinor !== expectedMinor ||
        attempt.currency_code !== "KES"
      ) {
        await service.from("akiba_provider_events").update({
          processing_status: "failed",
          retryable: false,
          processing_note: "Callback amount, currency, or receipt did not match the stored attempt; manual review required.",
        }).eq("id", eventId);
        return json({ ResultCode: 1, ResultDesc: "Payment details require manual reconciliation" }, 202);
      }

      const { error: postError } = await service.rpc("post_mpesa_contribution", {
        p_checkout_request_id: checkoutId,
        p_provider_receipt_number: receipt,
        p_amount_minor: String(amountMinor),
        p_currency_code: "KES",
        p_provider_result_code: callbackResultCode,
      });
      if (postError) throw postError;
    } else if (
      callbackResultCode !== "0" &&
      providerStatus.resultCode !== null &&
      providerStatus.resultCode !== "0"
    ) {
      const cancelled = callbackResultCode === "1032" || providerStatus.resultCode === "1032";
      const nextStatus = cancelled ? "cancelled" : "failed";
      await service.from("akiba_payment_attempts").update({
        status: nextStatus,
        response_code: providerStatus.resultCode,
        response_summary: (providerStatus.resultDescription || callbackDescription || "M-Pesa payment failed.").slice(0, 500),
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", attempt.id);
      await service.from("akiba_contribution_intents").update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", attempt.contribution_intent_id);
    } else if (
      providerStatus.resultCode !== null &&
      callbackResultCode !== providerStatus.resultCode &&
      (providerStatus.resultCode === "0" || callbackResultCode === "0")
    ) {
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: false,
        processing_note: "Callback and provider final results disagree; manual review required.",
      }).eq("id", eventId);
      return json({ ResultCode: 1, ResultDesc: "Callback and provider status disagree; manual review required" }, 202);
    } else {
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        retryable: true,
        attempt_count: 1,
        next_retry_at: new Date(Date.now() + 60_000).toISOString(),
        processing_note: "Provider status is not final; automatic reconciliation is scheduled.",
      }).eq("id", eventId);
      return json({ ResultCode: 0, ResultDesc: "Callback received; awaiting final provider status" });
    }

    await service.from("akiba_provider_events").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      retryable: false,
      processing_note: null,
    }).eq("id", eventId);

    return json({ ResultCode: 0, ResultDesc: "Callback processed" });
  } catch (error) {
    const retryable = error instanceof PaymentError ? error.retryable : true;
    console.error("[payments][daraja][callback] Callback reconciliation failed", {
      providerEventId: eventId,
      paymentAttemptId: attempt.id,
      checkoutRequestIdSuffix: checkoutId.slice(-6),
      errorCode: error instanceof PaymentError ? error.code : undefined,
      errorType: error instanceof PaymentError ? undefined : error instanceof Error ? error.name : typeof error,
      retryable,
    });
    await service.from("akiba_provider_events").update({
      processing_status: "failed",
      retryable,
      attempt_count: 1,
      next_retry_at: new Date(Date.now() + 60_000).toISOString(),
      processing_note: "Callback could not be reconciled immediately; automatic retry is scheduled.",
    }).eq("id", eventId);
    return json({ ResultCode: 1, ResultDesc: "Callback stored; automatic reconciliation is scheduled" }, 503);
  }
}
