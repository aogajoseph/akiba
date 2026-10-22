"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "");
  const currencyCode = String(formData.get("currency_code") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  if (name.length < 1 || name.length > 80 || !["event", "goal"].includes(purpose) || !/^[A-Z]{3}$/.test(currencyCode)) {
    redirect("/workspace/new?error=Check%20the%20Group%20name%2C%20purpose%20and%20three-letter%20currency%20code");
  }
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?message=Sign%20in%20to%20create%20a%20Group");
  const { data, error } = await supabase.from("akiba_groups").insert({
    name, purpose, currency_code: currencyCode, description, created_by: user.id,
  }).select("id").single();
  if (error || !data) redirect("/workspace/new?error=The%20Group%20could%20not%20be%20created.%20Please%20check%20your%20configuration%20and%20try%20again.");
  revalidatePath("/workspace");
  redirect("/workspace/groups/" + data.id);
}
