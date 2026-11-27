import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

/**
 * Trusted scheduled worker for two-hour withdrawal staging deadlines.
 * The database RPC locks each due request, checks flags, and atomically
 * releases or preserves its reservation. It never submits a payout.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ ok: false, error: "Not authorized" }, 401);

  const service = createServiceClient();
  const { data, error } = await service.rpc("akiba_process_due_withdrawal_staging", {
    p_batch_size: 25,
  });

  if (error) {
    console.error("[finance][withdrawals][staging] Staging processor failed", {
      code: error.code,
      message: error.message,
    });
    return json({ ok: false, error: "Could not process due withdrawal staging periods." }, 503);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return json({
    ok: true,
    processed: Number(result?.processed_count ?? 0),
    cancelledFlagged: Number(result?.cancelled_count ?? 0),
    queuedForPayout: Number(result?.payout_queued_count ?? 0),
    payoutExecutionEnabled: false,
    note: "Payouts remain queued until a sandbox provider supports verified payout execution and fee quotes.",
  });
}
