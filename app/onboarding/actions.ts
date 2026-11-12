"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect("/onboarding?error=" + encodeURIComponent(message));
}

function safeNext(value: string) {
  const candidate = String(value ?? "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\\\")) return "/workspace";
  try {
    return new URL(candidate, "https://akiba.invalid").origin === "https://akiba.invalid" ? candidate : "/workspace";
  } catch {
    return "/workspace";
  }
}

export async function saveProfile(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const rawPhone = String(formData.get("phone_number") ?? "").trim();
  const phoneNumber = rawPhone.replace(/[\s()-]/g, "");
  const submittedAvatarPath = String(formData.get("avatar_path") ?? "").trim();
  const removeAvatar = formData.get("remove_avatar") === "yes";
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) fail("Choose a valid username.");
  if (!displayName || displayName.length > 60) fail("Display name must be between 1 and 60 characters.");
  if (bio.length > 160) fail("Your bio must be 160 characters or fewer.");
  if (phoneNumber && !/^\+[1-9][0-9]{7,14}$/.test(phoneNumber)) fail("Enter a valid international phone number, including the country code.");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  let avatarPath: string | null = null;
  const { data: existing, error: existingError } = await supabase
    .from("akiba_profiles")
    .select("user_id, username, display_name, avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("Akiba profile lookup failed", { code: existingError.code });
    fail("Unable to load your profile. Please try again.");
  }

  if (submittedAvatarPath) {
    if (!submittedAvatarPath.startsWith(user.id + "/") || submittedAvatarPath.includes("..")) {
      fail("That profile picture path is not valid.");
    }
    avatarPath = submittedAvatarPath;
  } else if (!removeAvatar) {
    avatarPath = existing?.avatar_path ?? null;
  }

  const profileValues = {
    user_id: user.id,
    username,
    display_name: displayName,
    avatar_path: avatarPath,
    bio: bio || null,
    updated_at: new Date().toISOString(),
  };

  const result = existing
    ? await supabase.from("akiba_profiles").update(profileValues).eq("user_id", user.id)
    : await supabase.from("akiba_profiles").insert(profileValues);

  if (result.error) {
    console.error("Akiba profile save failed", { code: result.error.code, message: result.error.message });
    fail(result.error.code === "23505" ? "That username was just claimed. Choose another." : "Unable to save your profile. Please try again.");
  }

  if (phoneNumber) {
    const { data: existingContact, error: contactLookupError } = await supabase
      .from("akiba_user_contacts")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (contactLookupError) {
      console.error("Akiba contact lookup failed", { code: contactLookupError.code });
      fail("Your profile was saved, but we couldn't save the phone number. Please try again.");
    }
    const contactWrite = existingContact
      ? await supabase.from("akiba_user_contacts")
          .update({ phone_number: phoneNumber, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
      : await supabase.from("akiba_user_contacts")
          .insert({ user_id: user.id, phone_number: phoneNumber, updated_at: new Date().toISOString() });
    const contactError = contactWrite.error;
    if (contactError) {
      console.error("Akiba contact save failed", { code: contactError.code });
      fail("Your profile was saved, but we couldn't save the phone number. Please try again.");
    }
  } else {
    const { error: contactError } = await supabase.from("akiba_user_contacts").delete().eq("user_id", user.id);
    if (contactError) {
      console.error("Akiba contact removal failed", { code: contactError.code });
      fail("Your profile was saved, but we couldn't update the phone number. Please try again.");
    }
  }

  if (existing?.avatar_path && existing.avatar_path !== avatarPath) {
    const { error: removeError } = await supabase.storage.from("avatars").remove([existing.avatar_path]);
    if (removeError) console.error("Akiba old avatar cleanup failed", { code: removeError.name });
  }

  redirect(next);
}
