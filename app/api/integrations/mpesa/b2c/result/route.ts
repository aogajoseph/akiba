import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseB2CResultEvidence } from "@/lib/payments/providers/safaricom-daraja/b2c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}
function authorized(request: NextRequest): boolean {
  const expected = process.env.MPESA_B2C_CALLBACK_TOKEN;
  const received = request.nextUrl.searchParams.get("token");
  if (!expected || !received) return false;
  const a = Buffer.from(expected), b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
function parameterMap(payload: unknown): Map<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return new Map();
  const result = (payload as Record<string, unknown>).Result as Record<string, unknown> | undefined;
  const params = result?.ResultParameters as { ResultParameter?: Array<{ Key?: unknown; Value?: unknown }> } | undefined;
  return new Map((Array.isArray(params?.ResultParameter) ? params.ResultParameter : [])
    .filter((item) => typeof item?.Key === "string")
    .map((item) => [String(item.Key), item.Value]));
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ ResultCode: 1, ResultDesc: "Not authorized" }, 401);
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 65536) return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);
  const raw = await request.text();
  if (raw.length > 65536) return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, 400); }
  const evidence = parseB2CResultEvidence(payload);
  if (!evidence?.originatorConversationId || !evidence.conversationId) {
    return json({ ResultCode: 1, ResultDesc: "Missing B2C conversation reference" }, 400);
  }

  const params = parameterMap(payload);
  const transactionStatusRaw = params.get("TransactionStatus");
  const receiptRaw = params.get("ReceiptNo") ?? params.get("TransactionReceipt");
  const amountRaw = params.get("Amount") ?? params.get("TransactionAmount");
  const amountKes = amountRaw === undefined ? evidence.amountKes : Number(amountRaw);
  const amountMinorCandidate = Number(amountKes) * 100;
  const amountMinor = Number.isSafeInteger(amountKes) && Number(amountKes) > 0 &&
    Number.isSafeInteger(amountMinorCandidate) ? amountMinorCandidate : null;
  const receipt = typeof receiptRaw === "string" && /^[A-Z0-9]{10}$/i.test(receiptRaw)
    ? receiptRaw.toUpperCase() : evidence.receipt;
  const digest = createHash("sha256").update(raw).digest("hex");

  const service = createServiceClient();
  const { data: provider, error: providerError } = await service.from("akiba_payment_providers")
    .select("id").eq("provider_code", "safaricom_daraja").single();
  if (providerError || !provider) return json({ ResultCode: 1, ResultDesc: "Provider unavailable" }, 503);

  const { data: payoutAttempt } = await service.from("akiba_payout_attempts")
    .select("id,status_query_originator_id")
    .eq("provider_id", provider.id)
    .eq("status_query_originator_id", evidence.originatorConversationId)
    .maybeSingle();
  const eventKind = payoutAttempt ? "status_result" : "payout_result";

  const { error } = await service.rpc("akiba_record_daraja_sandbox_b2c_callback", {
    p_event_kind: eventKind,
    p_originator_conversation_id: evidence.originatorConversationId,
    p_conversation_id: evidence.conversationId,
    p_transaction_id: evidence.transactionId,
    p_result_code: evidence.resultCode,
    p_result_description: typeof (payload as Record<string, unknown>)?.Result === "object"
      ? String(((payload as { Result: Record<string, unknown> }).Result).ResultDesc ?? "").slice(0, 500) : null,
    p_amount_minor: amountMinor,
    p_receipt: receipt,
    p_transaction_status: typeof transactionStatusRaw === "string" ? transactionStatusRaw.slice(0, 100) : null,
    p_response_digest: digest,
  });
  if (error) {
    console.error("[payments][daraja][b2c-result] Callback could not be matched or stored", { code: error.code });
    return json({ ResultCode: 1, ResultDesc: "Callback could not be matched; manual reconciliation required" }, 503);
  }
  return json({ ResultCode: 0, ResultDesc: "B2C callback durably recorded; settlement is subject to independent verification" });
}
