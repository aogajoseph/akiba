import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const failure = (message: string) =>
    NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(message), origin));

  if (!url || !key) return failure("Authentication is not configured.");

  // Persist session cookies on the redirect response itself.
  // Writing to next/headers cookies alone can lose Set-Cookie on redirects.
  let response = NextResponse.redirect(new URL("/onboarding", origin));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
    console.error("Akiba code exchange failed", { code: error.code, message: error.message });
    return failure(error.code === "bad_code_verifier"
      ? "Confirmation could not complete in this browser. Please sign up or request a new confirmation link in the same browser."
      : "Email confirmation failed. Please request a new confirmation link.");
  }

  if (tokenHash && type === "signup") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });
    if (!error) return response;
    console.error("Akiba email verification failed", { code: error.code, message: error.message });
    return failure("Email confirmation failed. Please request a new confirmation link.");
  }

  return failure("This confirmation link is invalid. Please request a new confirmation link.");
}
