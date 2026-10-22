"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function saveUsername(formData: FormData) {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) redirect("/onboarding?error=Choose%20a%20valid%20username");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: existing } = await supabase.from("akiba_profiles").select("username").eq("user_id", user.id).maybeSingle();
  if (existing) redirect("/workspace");
  const { error } = await supabase.from("akiba_profiles").insert({ user_id: user.id, username });
  if (error) {
    console.error("Akiba profile creation failed", { code: error.code, message: error.message });
    redirect("/onboarding?error=" + encodeURIComponent(error.code === "23505" ? "That username was just claimed. Choose another." : "Unable to save your profile. Please try again."));
  }
  redirect("/onboarding/complete");
}
