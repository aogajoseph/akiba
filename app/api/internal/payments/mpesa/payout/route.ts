import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { classifyB2CSubmissionFailure, readDarajaB2CPayoutConfig, submitB2CPayout } from "@/lib/payments/providers/safaricom-daraja/b2c";
import { PaymentError } from "@/lib/payments/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PayoutClaim = {
  payout_attempt_id: string;
  withdrawal_request_id: string;
  request_reference: string;
  recipient_amount_minor: number | string;
  currency_code: string;
};

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

function sandboxPreviewOnly(): boolean {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.MPESA_ENVIRONMENT === "sandbox";
}

async function submitClaims(claims: PayoutClaim[], config: Extract<ReturnType<typeof readDarajaB2CPayoutConfig>, { ok: true }>["config"]) {
  const service = createServiceClient();
  let accepted = 0;
  let notSubmitted = 0;
  let rejected = 0;
  let unknown = 0;
  let persistenceFailures = 0;

  for (const claim of claims) {
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
        p_response_code: "INVALID_CLAIM",
        p_response_summary: "Submission disposition: not_submitted. Claimed payout had an invalid KES amount; manual review required.",
      });
      if (error) persistenceFailures += 1;
      else notSubmitted += 1;
      continue;
    }

    let result: Awaited<ReturnType<typeof submitB2CPayout>>;
    try {
      result = await submitB2CPayout({
        amountKes: amountMinor / 100,
        requestReference: claim.request_reference,
        remarks: "Akiba sandbox withdrawal " + claim.request_reference.slice(0, 12),
        occasion: "Akiba sandbox payout",
      }, config);
    } catch (error) {
      const summary = error instanceof Error
        ? error.message.slice(0, 500)
        : "Daraja submission outcome is unknown.";
      let persistError: { code?: string } | null = null;
      try {
        const response = await service.rpc("akiba_record_daraja_sandbox_payout_submission", {
          p_payout_attempt_id: claim.payout_attempt_id,
          p_accepted: false,
          p_response_code: error instanceof PaymentError ? error.code : null,
          p_response_summary: `Submission disposition: ${classifyB2CSubmissionFailure(error)}. ${summary}`.slice(0, 500),
        });
        persistError = response.error;
      } catch (cause) {
        persistError = { code: cause instanceof Error ? cause.name : "UNKNOWN" };
      }
      if (persistError) {
        console.error("[payments][daraja][payout] Submission failure classification could not be persisted", {
          attemptId: claim.payout_attempt_id,
          disposition: classifyB2CSubmissionFailure(error),
          code: persistError.code,
        });
        persistenceFailures += 1;
      } else {
        const disposition = classifyB2CSubmissionFailure(error);
        if (disposition === "not_submitted") notSubmitted += 1;
        else if (disposition === "rejected") rejected += 1;
        else unknown += 1;
      }
      continue;
    }

    // A successful provider response followed by a DB persistence failure is
    // ambiguous. Never submit a second B2C instruction for this attempt.
    let recorded: boolean | null = null;
    let persistError: { code?: string } | null = null;
    try {
      const response = await service.rpc("akiba_record_daraja_sandbox_payout_submission", {
        p_payout_attempt_id: claim.payout_attempt_id,
        p_accepted: true,
        p_provider_payout_ref: result.originatorConversationId,
        p_provider_conversation_id: result.conversationId,
        p_response_code: result.responseCode,
        p_response_summary: result.responseDescription ?? "Safaricom accepted the B2C instruction.",
        p_response_digest: result.responseDigest,
      });
      recorded = response.data;
      persistError = response.error;
    } catch (cause) {
      persistError = { code: cause instanceof Error ? cause.name : "UNKNOWN" };
    }

    if (persistError || recorded !== true) {
      console.error("[payments][daraja][payout] ACCEPTED_PERSISTENCE_FAILED: provider accepted the instruction but the database did not confirm persistence. Never resubmit; reconcile the existing attempt.", {
        attemptId: claim.payout_attempt_id,
        withdrawalRequestId: claim.withdrawal_request_id,
        providerOriginatorConversationId: result.originatorConversationId,
        code: persistError?.code ?? "RPC_RETURNED_FALSE",
      });
      persistenceFailures += 1;
    } else {
      accepted += 1;
    }
  }

  return {
    ok: persistenceFailures === 0,
    claimed: claims.length,
    accepted,
    notSubmitted,
    rejected,
    unknown,
    persistenceFailures,
  };
}

/**
 * Automatic/batch payout invocation is intentionally disabled. Only the
 * request-scoped POST endpoint below can submit a sandbox instruction.
 */
export async function GET() {
  return json({ ok: false, error: "Batch payout execution is disabled. Use the authenticated one-request Preview sandbox trigger." }, 405);
}

/**
 * Operator-triggered single-request path. It is deliberately Preview-only,
 * requires CRON_SECRET, accepts one UUID, and uses a request-scoped DB claim
 * so it cannot pick up another group's queued withdrawal.
 */
export async function POST(request: NextRequest) {
  const cronAuthorized = authorized(request);
  if (!cronAuthorized && request.headers.get("origin") !== request.nextUrl.origin) {
    return json({ ok: false, error: "Not authorized" }, 401);
  }
  if (!sandboxPreviewOnly()) return json({ ok: false, error: "Manual payout trigger is restricted to Preview sandbox." }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "A JSON request body is required." }, 400);
  }
  const requestId = body && typeof body === "object" && "requestId" in body
    ? (body as { requestId?: unknown }).requestId
    : null;
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return json({ ok: false, error: "A valid withdrawal requestId is required." }, 400);
  }

  if (!cronAuthorized) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ ok: false, error: "Sign in as the Group Creator to trigger this test." }, 401);

    const testGroupId = "ff4d3bbf-7d7d-4513-a083-be85d876b908";
    const { data: membership, error: membershipError } = await supabase
      .from("akiba_group_memberships")
      .select("role,status")
      .eq("group_id", testGroupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError || membership?.role !== "group_creator" || membership.status !== "active") {
      return json({ ok: false, error: "Only the active Group Creator of Globe Technologies HQ can trigger this sandbox test." }, 403);
    }

    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("akiba_withdrawal_requests")
      .select("id,status,group_id")
      .eq("id", requestId)
      .eq("group_id", testGroupId)
      .maybeSingle();
    if (withdrawalError || withdrawal?.status !== "payout_queued") {
      return json({ ok: false, error: "Only a queued Globe Technologies HQ withdrawal can be submitted." }, 409);
    }
  }

  const configResult = readDarajaB2CPayoutConfig();
  if (!configResult.ok) {
    return json({ ok: false, error: "Daraja sandbox payout configuration is incomplete or disabled." }, 503);
  }

  const service = createServiceClient();
  const { data: claims, error: claimError } = await service.rpc(
    "akiba_claim_daraja_sandbox_payout_for_request",
    { p_withdrawal_request_id: requestId },
  );
  if (claimError) {
    console.error("[payments][daraja][payout] Could not claim requested sandbox payout", {
      requestId,
      code: claimError.code,
    });
    return json({ ok: false, error: "Could not claim the requested payout." }, 503);
  }
  if (!claims?.length) {
    return json({
      ok: false,
      claimed: 0,
      error: "This request is not eligible for submission. Check that it is queued, unexpired, fully approved, unflagged, and has no prior payout attempt.",
    }, 409);
  }

  const result = await submitClaims(claims as PayoutClaim[], configResult.config);
  return json({ requestId, ...result }, result.persistenceFailures ? 500 : 200);
}
