import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const username = (request.nextUrl.searchParams.get("username") || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) return NextResponse.json({ available: false, reason: "Use 3–20 characters, starting with a letter; letters, numbers and underscores only." });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ available: false, reason: "Sign in first." }, { status: 401 });
  const { data, error } = await supabase.from("akiba_profiles").select("user_id").eq("username", username).maybeSingle();
  if (error) return NextResponse.json({ available: false, reason: "Availability could not be checked." }, { status: 503 });
  return NextResponse.json({ available: !data || data.user_id === user.id });
}
