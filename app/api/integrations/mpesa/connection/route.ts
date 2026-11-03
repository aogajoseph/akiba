import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/**
 * Preview-only connectivity check. It obtains an OAuth token but never returns
 * the token, initiates a payment, or writes to the database.
 */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return json({ ok: false, error: "This check is available only on a Vercel Preview deployment." }, 404);
  }

  const environment = process.env.MPESA_ENVIRONMENT;
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (environment !== "sandbox") {
    return json({ ok: false, error: "M-Pesa environment must be set to sandbox for this check." }, 503);
  }

  if (!consumerKey || !consumerSecret) {
    return json({ ok: false, error: "Daraja Consumer Key or Consumer Secret is not configured." }, 503);
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "Sign in to Akiba before running the connection check." }, 401);
  }

  try {
    const credentials = Buffer.from(consumerKey + ":" + consumerSecret).toString("base64");
    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: { Authorization: "Basic " + credentials, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );

    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const providerMessage =
        typeof result === "object" && result !== null && "error_description" in result &&
        typeof result.error_description === "string"
          ? result.error_description
          : "Safaricom did not accept the OAuth request.";
      return json(
        { ok: false, provider: "safaricom-daraja", environment, status: response.status, error: providerMessage },
        502,
      );
    }

    const tokenResult = result as { access_token?: unknown; expires_in?: unknown };
    if (typeof tokenResult.access_token !== "string" || tokenResult.access_token.length === 0) {
      return json({ ok: false, provider: "safaricom-daraja", environment, error: "Safaricom returned an unexpected OAuth response." }, 502);
    }

    return json({
      ok: true,
      provider: "safaricom-daraja",
      environment,
      authenticated: true,
      tokenExpiresIn: typeof tokenResult.expires_in === "string" ? tokenResult.expires_in : null,
      message: "Daraja sandbox OAuth connection succeeded. No payment was initiated.",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return json({
      ok: false,
      provider: "safaricom-daraja",
      environment,
      error: timedOut ? "Safaricom OAuth request timed out." : "Could not reach Safaricom OAuth. Check the Preview deployment logs.",
    }, 502);
  }
}