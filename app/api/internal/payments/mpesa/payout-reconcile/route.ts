import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readDarajaB2CStatusConfig, queryB2CTransactionStatus } from "@/lib/payments/providers/safaricom-daraja/b2c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BATCH_SIZE = 1;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

/**
 * Initiates only read-only Daraja transaction-status inquiries. It never
 * creates payout attempts or submits a second B2C payment instruction.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ ok: false, error: "Not authorized" }, 401);
  const configResult = readDarajaB2CStatusConfig();
  if (!configResult.ok) return json({ ok: false, error: "Daraja sandbox configuration is incomplete or disabled." }, 503);

  const service = createServiceClient();
  const { data: provider, error: providerError } = await service.from("akiba_payment_providers")
    .select("id").eq("provider_code", "safaricom_daraja").single();
  if (providerError || !provider) return json({ ok: false, error: "Provider unavailable" }, 503);

  const { data: attempts, error } = await service.from("akiba_payout_attempts")
    .select("id,provider_transaction_id,status")
    .eq("provider_id", provider.id)
    .not("provider_transaction_id", "is", null)
    .not("provider_receipt_number", "is", null)
    .is("status_query_originator_id", null)
    .in("status", ["submitted", "processing", "unknown"])
    .order("submitted_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) return json({ ok: false, error: "Could not load pending payout verifications" }, 503);

  let submitted = 0, deferred = 0;
  for (const attempt of attempts ?? []) {
    try {
      const query = await queryB2CTransactionStatus(attempt.provider_transaction_id!, configResult.config);
      if (query.responseCode !== "0" || !query.originatorConversationId) {
        deferred += 1;
        continue;
      }
      const { data: recorded, error: recordError } = await service.rpc(
        "akiba_record_daraja_status_query_submission",
        {
          p_payout_attempt_id: attempt.id,
          p_originator_conversation_id: query.originatorConversationId,
          p_conversation_id: query.conversationId,
          p_response_code: query.responseCode,
          p_response_digest: query.responseDigest,
        },
      );
      if (recordError || recorded !== true) deferred += 1;
      else submitted += 1;
    } catch (cause) {
      console.error("[payments][daraja][status-query] Inquiry failed", {
        payoutAttemptId: attempt.id,
        errorType: cause instanceof Error ? cause.name : typeof cause,
      });
      deferred += 1;
    }
  }
  return json({ ok: true, scanned: attempts?.length ?? 0, inquiriesSubmitted: submitted, deferred });
}
