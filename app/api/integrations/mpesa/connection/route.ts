import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProviderAdapter } from "@/lib/payments/registry";
import { readDarajaConfig } from "@/lib/payments/providers/safaricom-daraja/config";

export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/**
 * Preview-only connectivity check. It obtains a Daraja OAuth token through
 * the registered provider adapter but never returns the token, initiates a
 * payment, or writes to the database.
 */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return json({ ok: false, error: "This check is available only on a Vercel Preview deployment." }, 404);
  }

  if (process.env.MPESA_ENVIRONMENT !== "sandbox") {
    return json({ ok: false, error: "M-Pesa environment must be set to sandbox for this check." }, 503);
  }

  const configResult = readDarajaConfig();
  if (!configResult.ok) {
    return json({ ok: false, error: configResult.error }, 503);
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "Sign in to Akiba before running the connection check." }, 401);
  }

  const adapter = getPaymentProviderAdapter("safaricom_daraja");
  if (!adapter) {
    return json({ ok: false, error: "M-Pesa provider adapter is not registered." }, 500);
  }

  const connection = await adapter.checkConnection(configResult.config);
  if (!connection.ok) {
    return json(
      {
        ok: false,
        provider: "safaricom-daraja",
        environment: connection.environment,
        error: connection.error ?? "Daraja sandbox connection failed.",
      },
      502,
    );
  }

  return json({
    ok: true,
    provider: "safaricom-daraja",
    environment: connection.environment,
    authenticated: true,
    tokenExpiresIn:
      connection.tokenExpiresInSeconds === null ||
      connection.tokenExpiresInSeconds === undefined
        ? null
        : String(connection.tokenExpiresInSeconds),
    message: "Daraja sandbox OAuth connection succeeded. No payment was initiated.",
  });
}
