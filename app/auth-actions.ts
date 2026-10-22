"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function signIn(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=Enter%20your%20email%20and%20password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Unable%20to%20sign%20in.%20Check%20your%20details%20and%20email%20confirmation.");
  redirect("/workspace");
}

export async function signUp(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) redirect("/signup?error=Enter%20a%20valid%20email%20and%20a%20password%20of%20at%20least%208%20characters");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").toString() },
  });
  if (error) redirect("/signup?error=Unable%20to%20create%20account.%20Check%20the%20details%20and%20try%20again.");
  if (data.session) redirect("/workspace");
  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20Akiba%20account%20before%20signing%20in.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=You%20have%20signed%20out.");
}
