import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

const TERMINAL_INTENT_STATUSES = new Set(["succeeded", "failed", "cancelled", "expired"]);

function statusMessage(intentStatus: string, attemptStatus: string): string {
  if (intentStatus === "succeeded" || attemptStatus === "succeeded") {
    return "Your contribution is confirmed and included in the group finances.";
  }
  if (intentStatus === "failed" || attemptStatus === "failed") {
    return "This payment attempt was not completed. It has not been added to group funds.";
  }
  if (intentStatus === "cancelled" || attemptStatus === "cancelled") {
    return "This payment was cancelled and has not been added to group funds.";
  }
  if (intentStatus === "expired" || attemptStatus === "expired") {
    return "This payment attempt expired and has not been added to group funds.";
  }
  return "Akiba is checking this payment in the background. Do not start another contribution while its status is pending.";
}

/**
 * This endpoint reads Akiba's durable payment state only.
 *
 * Provider queries belong to the scheduled reconciliation worker, not to a
 * user-triggered status poll. Keeping this route local prevents repeated UI
 * refreshes from rate-limiting Daraja and ensures every client sees the same
 * reconciled state.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ intentId: string }> },
) {
  const userClient = await createUserClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "Sign in to check this contribution." }, 401);
  }

  const { intentId } = await context.params;
  const service = createServiceClient();
  const { data: intent, error: intentError } = await service
    .from("akiba_contribution_intents")
    .select("id,contributor_id,status,currency_code,amount_minor")
    .eq("id", intentId)
    .eq("contributor_id", user.id)
    .maybeSingle();

  if (intentError || !intent) {
    return json({ ok: false, error: "Contribution not found." }, 404);
  }

  const { data: attempt, error: attemptError } = await service
    .from("akiba_payment_attempts")
    .select("id,status")
    .eq("contribution_intent_id", intentId)
    .maybeSingle();

  if (attemptError || !attempt) {
    return json({ ok: false, error: "Payment attempt not found." }, 404);
  }

  const terminal = TERMINAL_INTENT_STATUSES.has(intent.status) ||
    ["succeeded", "failed", "cancelled", "expired"].includes(attempt.status);
  const paymentStatus = TERMINAL_INTENT_STATUSES.has(intent.status)
    ? intent.status
    : attempt.status;

  return json({
    ok: true,
    status: intent.status,
    paymentStatus,
    currencyCode: intent.currency_code,
    amountMinor: intent.amount_minor,
    terminal,
    message: statusMessage(intent.status, attempt.status),
  }, terminal ? 200 : 202);
}
