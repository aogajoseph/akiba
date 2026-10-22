"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "");
  const currencyCode = String(formData.get("currency_code") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();

  if (
    name.length < 1 ||
    name.length > 80 ||
    !["event", "goal"].includes(purpose) ||
    !/^[A-Z]{3}$/.test(currencyCode)
  ) {
    redirect(
      "/workspace/new?error=Check%20the%20Group%20name%2C%20purpose%20and%20three-letter%20currency%20code",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?message=Sign%20in%20to%20create%20a%20Group");
  }

  const { data: profile } = await supabase
    .from("akiba_profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  // Generate the ID in the server action so the insert does not need RETURNING.
  // The Group SELECT policy depends on the owner-membership trigger, and INSERT
  // ... RETURNING can evaluate SELECT visibility before that membership is visible.
  const groupId = randomUUID();
  const { error } = await supabase.from("akiba_groups").insert({
    id: groupId,
    name,
    purpose,
    currency_code: currencyCode,
    description,
  });

  if (error) {
    console.error("Akiba Group insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    redirect(
      "/workspace/new?error=" +
        encodeURIComponent(
          "The Group could not be created. Please try again. If this continues, contact support.",
        ),
    );
  }

  revalidatePath("/workspace");
  redirect("/workspace/groups/" + groupId);
}
