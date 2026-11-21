import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readDarajaB2CPayoutConfig } from "@/lib/payments/providers/safaricom-daraja/b2c";
import { submitB2CPayout } from "@/lib/payments/providers/safaricom-daraja/b2c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 3;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

/**
 * Claims each eligible withdrawal exactly once before calling Daraja.
 * Claimed attempts are never automatically resubmitted: a timeout or process
 * crash is treated as an unknown outcome and held for independent reconciliation.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ ok: false, error: "Not authorized" }, 401);

  const configResult = readDarajaB2CPayoutConfig();
  if (!configResult.ok) {
    return json({ ok: false, error: "Daraja sandbox payout configuration is incomplete or disabled." }, 503);
  }

  const service = createServiceClient();
  const { data: claims, error: claimError } = await service.rpc(
    "akiba_claim_daraja_sandbox_payouts",
    { p_batch_size: BATCH_SIZE },
  );

  if (claimError) {
    console.error("[payments][daraja][payout] Could not claim sandbox payout work", {
      code: claimError.code,
    });
    return json({ ok: false, error: "Could not claim payout work." }, 503);
  }

  let accepted = 0;
  let unknown = 0;
  let persistenceFailures = 0;

  for (const claim of (claims ?? []) as Array<{
    payout_attempt_id: string;
    withdrawal_request_id: string;
    request_reference: string;
    recipient_amount_minor: number | string;
    currency_code: string;
  }>) {
    const amountMinor = Number(claim.recipient_amount_minor);
    if (
      claim.currency_code !== "KES" ||
      !Number.isSafeInteger(amountMinor) ||
      amountMinor < 100 ||
      amountMinor % 100 !== 0
    ) {
      await service.from("akiba_payout_attempts").update({
        status: "unknown",
        reconciliation_status: "pending",
        reconciliation_note: "Claimed payout had an invalid KES amount; manual review required.",
        updated_at: new Date().toISOString(),
      }).eq("id", claim.payout_attempt_id).eq("status", "submitted");
      await service.from("akiba_withdrawal_requests").update({
        status: "reconciliation_required",
        resolution_note: "The claimed payout amount was invalid; reservation retained for manual review.",
        updated_at: new Date().toISOString(),
      }).eq("id", claim.withdrawal_request_id).eq("status", "payout_submitted");
      unknown += 1;
      continue;
    }

    try {
      const result = await submitB2CPayout({
        amountKes: amountMinor / 100,
        requestReference: claim.request_reference,
        remarks: "Akiba sandbox withdrawal " + claim.request_reference.slice(0, 12),
        occasion: "Akiba sandbox payout",
      }, configResult.config);

      const now = new Date().toISOString();
      const { data: updatedAttempt, error: attemptUpdateError } = await service
        .from("akiba_payout_attempts")
        .update({
          status: "processing",
          provider_payout_ref: result.originatorConversationId,
          provider_conversation_id: result.conversationId,
          response_code: result.responseCode,
          response_summary: result.responseDescription?.slice(0, 500) ?? "Safaricom accepted the B2C instruction.",
          response_digest: result.responseDigest,
          reconciliation_status: "pending",
          reconciliation_note: "Daraja accepted the B2C instruction; awaiting callback and independent verification.",
          updated_at: now,
        })
        .eq("id", claim.payout_attempt_id)
        .eq("status", "submitted")
        .select("id")
        .maybeSingle();

      if (attemptUpdateError || !updatedAttempt) {
        console.error("[payments][daraja][payout] Accepted instruction could not be persisted", {
          attemptId: claim.payout_attempt_id,
        });
        persistenceFailures += 1;
        continue;
      }

      const { error: requestUpdateError } = await service
        .from("akiba_withdrawal_requests")
        .update({
          status: "payout_processing",
          updated_at: now,
        })
        .eq("id", claim.withdrawal_request_id)
        .eq("status", "payout_submitted");

      if (requestUpdateError) {
        console.error("[payments][daraja][payout] Accepted payout request state could not be updated", {
          attemptId: claim.payout_attempt_id,
        });
        persistenceFailures += 1;
        continue;
      }
      accepted += 1;
    } catch (error) {
      const now = new Date().toISOString();
      const summary = error instanceof Error
        ? error.message.slice(0, 500)
        : "Daraja submission outcome is unknown.";
      const { error: attemptUpdateError } = await service
        .from("akiba_payout_attempts")
        .update({
          status: "unknown",
          reconciliation_status: "pending",
          reconciliation_note: "B2C submission outcome is uncertain. Automatic resubmission is prohibited. " + summary,
          updated_at: now,
        })
        .eq("id", claim.payout_attempt_id)
        .eq("status", "submitted");

      const { error: requestUpdateError } = await service
        .from("akiba_withdrawal_requests")
        .update({
          status: "reconciliation_required",
          resolution_note: "Daraja submission outcome is uncertain; the reservation remains active pending independent reconciliation.",
          updated_at: now,
        })
        .eq("id", claim.withdrawal_request_id)
        .eq("status", "payout_submitted");

      if (attemptUpdateError || requestUpdateError) {
        console.error("[payments][daraja][payout] Uncertain outcome could not be fully persisted", {
          attemptId: claim.payout_attempt_id,
          attemptUpdateFailed: Boolean(attemptUpdateError),
          requestUpdateFailed: Boolean(requestUpdateError),
        });
        persistenceFailures += 1;
      } else {
        unknown += 1;
      }
    }
  }

  return json({
    ok: persistenceFailures === 0,
    claimed: (claims ?? []).length,
    accepted,
    unknown,
    persistenceFailures,
  }, persistenceFailures ? 500 : 200);
}
