import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readDarajaConfig } from "@/lib/payments/providers/safaricom-daraja/config";
import { queryStkPush } from "@/lib/payments/providers/safaricom-daraja/stk";

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
    return json({ ResultCode: 1, ResultDesc: "Not authorized" }, 401);
  }
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 65536) {
    return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);
  }

  const rawBody = await request.text();
  if (rawBody.length > 65536) {
    return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, 400);
  }

  const body = payload.Body as Record<string, unknown> | undefined;
  const callback = body?.stkCallback as Record<string, unknown> | undefined;
  const checkoutId = typeof callback?.CheckoutRequestID === "string"
    ? callback.CheckoutRequestID
    : "";
  const merchantId = typeof callback?.MerchantRequestID === "string"
    ? callback.MerchantRequestID
    : null;
  const callbackResultCode =
    callback?.ResultCode === undefined ? null : String(callback.ResultCode);
  const callbackDescription =
    typeof callback?.ResultDesc === "string" ? callback.ResultDesc : null;
  const metadata = callbackMetadata(callback?.CallbackMetadata && typeof callback.CallbackMetadata === "object"
    ? (callback.CallbackMetadata as Record<string, unknown>).Item
    : null);
  if (!checkoutId || callbackResultCode === null) {
    return json({ ResultCode: 1, ResultDesc: "Missing callback transaction reference" }, 400);
  }

  const configResult = readDarajaConfig();
  if (!configResult.ok) {
    return json({ ResultCode: 1, ResultDesc: "Provider configuration unavailable" }, 503);
  }

  const service = createServiceClient();
  const { data: provider, error: providerError } = await service
    .from("akiba_payment_providers")
    .select("id")
    .eq("provider_code", "safaricom_daraja")
    .single();
  if (providerError || !provider) {
    return json({ ResultCode: 1, ResultDesc: "Provider not registered" }, 503);
  }

  const { data: attempt, error: attemptError } = await service
    .from("akiba_payment_attempts")
    .select("id,contribution_intent_id,amount_minor,currency_code,status,provider_attempt_ref")
    .eq("provider_id", provider.id)
    .eq("provider_attempt_ref", checkoutId)
    .maybeSingle();
  if (attemptError || !attempt) {
    return json({ ResultCode: 1, ResultDesc: "Unknown payment reference" }, 404);
  }

  const digest = createHash("sha256").update(rawBody).digest("hex");
  const { data: insertedEvent, error: eventInsertError } = await service
    .from("akiba_provider_events")
    .insert({
      provider_id: provider.id,
      provider_event_ref: checkoutId,
      event_type: "mpesa_stk_callback",
      source_reference: merchantId,
      payload_digest: digest,
      processing_status: "received",
    })
    .select("id")
    .maybeSingle();

  let eventId = insertedEvent?.id as string | undefined;
  if (eventInsertError?.code === "23505") {
    const { data: existingEvent, error: existingEventError } = await service
      .from("akiba_provider_events")
      .select("id,processing_status")
      .eq("provider_id", provider.id)
      .eq("provider_event_ref", checkoutId)
      .single();
    if (existingEventError || !existingEvent) {
      return json({ ResultCode: 1, ResultDesc: "Could not load callback record" }, 503);
    }
    if (existingEvent.processing_status === "processed") {
      return json({ ResultCode: 0, ResultDesc: "Duplicate callback acknowledged" });
    }
    eventId = existingEvent.id;
  } else if (eventInsertError) {
    return json({ ResultCode: 1, ResultDesc: "Could not record callback" }, 503);
  }
  if (!eventId) return json({ ResultCode: 1, ResultDesc: "Could not record callback" }, 503);

  try {
    // Daraja callbacks are not cryptographically signed. Treat the callback as
    // a notification only; query Safaricom independently before changing money.
    const providerStatus = await queryStkPush(checkoutId, configResult.config);
    if (providerStatus.checkoutRequestId !== checkoutId) {
      throw new Error("Provider status reference did not match the callback.");
    }

    if (callbackResultCode === "0" && providerStatus.resultCode === "0") {
      const amountKes = Number(metadata.Amount);
      const receipt = typeof metadata.MpesaReceiptNumber === "string"
        ? metadata.MpesaReceiptNumber
        : "";
      const amountMinor = Number.isSafeInteger(amountKes) ? amountKes * 100 : NaN;
      const expectedMinor = Number(attempt.amount_minor);
      if (
        !receipt ||
        !Number.isSafeInteger(amountMinor) ||
        amountMinor !== expectedMinor ||
        attempt.currency_code !== "KES"
      ) {
        await service.from("akiba_provider_events").update({
          processing_status: "failed",
          processing_note: "Callback amount, currency, or receipt did not match the stored payment attempt.",
        }).eq("id", eventId);
        return json({ ResultCode: 1, ResultDesc: "Payment details require reconciliation" }, 202);
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
    } else {
      await service.from("akiba_provider_events").update({
        processing_status: "failed",
        processing_note: "Provider status is not final; the contribution remains unposted.",
      }).eq("id", eventId);
      return json({ ResultCode: 0, ResultDesc: "Callback received; awaiting final provider status" });
    }

    await service.from("akiba_provider_events").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      processing_note: null,
    }).eq("id", eventId);

    return json({ ResultCode: 0, ResultDesc: "Callback processed" });
  } catch {
    await service.from("akiba_provider_events").update({
      processing_status: "failed",
      processing_note: "Callback could not be reconciled with the provider status API.",
    }).eq("id", eventId);
    return json({ ResultCode: 1, ResultDesc: "Callback processing failed; reconciliation is required" }, 503);
  }
}
