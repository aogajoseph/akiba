import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readDarajaB2CPayoutConfig, submitB2CPayout } from "@/lib/payments/providers/safaricom-daraja/b2c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 1;

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
      const { error } = await service.rpc("akiba_record_daraja_sandbox_payout_submission", {
        p_payout_attempt_id: claim.payout_attempt_id,
        p_accepted: false,
        p_response_summary: "Claimed payout had an invalid KES amount; manual review required.",
      });
      if (error) persistenceFailures += 1;
      else unknown += 1;
      continue;
    }

    try {
      const result = await submitB2CPayout({
        amountKes: amountMinor / 100,
        requestReference: claim.request_reference,
        remarks: "Akiba sandbox withdrawal " + claim.request_reference.slice(0, 12),
        occasion: "Akiba sandbox payout",
      }, configResult.config);

      const { error } = await service.rpc("akiba_record_daraja_sandbox_payout_submission", {
        p_payout_attempt_id: claim.payout_attempt_id,
        p_accepted: true,
        p_provider_payout_ref: result.originatorConversationId,
        p_provider_conversation_id: result.conversationId,
        p_response_code: result.responseCode,
        p_response_summary: result.responseDescription ?? "Safaricom accepted the B2C instruction.",
        p_response_digest: result.responseDigest,
      });
      if (error) {
        console.error("[payments][daraja][payout] ACCEPTED_PERSISTENCE_FAILED: provider accepted the instruction but the database did not confirm persistence. Never resubmit; reconcile the existing attempt.", {
          attemptId: claim.payout_attempt_id,
          withdrawalRequestId: claim.withdrawal_request_id,
          providerOriginatorConversationId: result.originatorConversationId,
          code: error.code,
        });
        persistenceFailures += 1;
      } else {
        accepted += 1;
      }
    } catch (error) {
      const summary = error instanceof Error
        ? error.message.slice(0, 500)
        : "Daraja submission outcome is unknown.";
      const { error: persistError } = await service.rpc("akiba_record_daraja_sandbox_payout_submission", {
        p_payout_attempt_id: claim.payout_attempt_id,
        p_accepted: false,
        p_response_code: error instanceof Error && "code" in error ? String(error.code).slice(0, 100) : null,
        p_response_summary: (() => {
          const disposition = error instanceof Error && "submissionOutcome" in error
            ? String(error.submissionOutcome)
            : "unknown";
          return `Submission disposition: ${disposition}. ${summary}`.slice(0, 500);
        })(),
      });
      if (persistError) {
        console.error("[payments][daraja][payout] Uncertain outcome could not be persisted", {
          attemptId: claim.payout_attempt_id,
          code: persistError.code,
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
