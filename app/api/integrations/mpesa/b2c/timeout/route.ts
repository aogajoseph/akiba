import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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
export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ ResultCode: 1, ResultDesc: "Not authorized" }, 401);
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 65536) return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);
  const raw = await request.text();
  if (raw.length > 65536) return json({ ResultCode: 1, ResultDesc: "Payload too large" }, 413);
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ ResultCode: 1, ResultDesc: "Invalid timeout payload" }, 400);
  }
  const result = (payload as Record<string, unknown>).Result as Record<string, unknown> | undefined;
  const originator = typeof result?.OriginatorConversationID === "string" ? result.OriginatorConversationID : "";
  const conversation = typeof result?.ConversationID === "string" ? result.ConversationID : "";
  if (!originator || !conversation) return json({ ResultCode: 1, ResultDesc: "Missing conversation reference" }, 400);

  const service = createServiceClient();
  const { data: provider, error: providerError } = await service.from("akiba_payment_providers")
    .select("id").eq("provider_code", "safaricom_daraja").single();
  if (providerError || !provider) return json({ ResultCode: 1, ResultDesc: "Provider unavailable" }, 503);
  const { data: queryAttempt } = await service.from("akiba_payout_attempts")
    .select("id").eq("provider_id", provider.id)
    .eq("status_query_originator_id", originator).maybeSingle();
  const eventKind = queryAttempt ? "status_timeout" : "payout_timeout";
  const digest = createHash("sha256").update(raw).digest("hex");
  const { error } = await service.rpc("akiba_record_daraja_sandbox_b2c_callback", {
    p_event_kind: eventKind,
    p_originator_conversation_id: originator,
    p_conversation_id: conversation,
    p_transaction_id: null,
    p_result_code: null,
    p_result_description: typeof result?.ResultDesc === "string" ? result.ResultDesc.slice(0,500) : "Daraja B2C queue timeout",
    p_amount_minor: null,
    p_receipt: null,
    p_transaction_status: null,
    p_response_digest: digest,
  });
  if (error) {
    console.error("[payments][daraja][b2c-timeout] Timeout callback could not be matched", { code: error.code });
    return json({ ResultCode: 1, ResultDesc: "Timeout could not be matched; manual review required" }, 503);
  }
  return json({ ResultCode: 0, ResultDesc: "Timeout recorded; reservation remains protected pending reconciliation" });
}
