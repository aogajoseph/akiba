"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function back(message: string, kind: "error" | "success" = "error"): never {
  redirect("/workspace/profile?" + kind + "=" + encodeURIComponent(message));
}

const VISIBILITY_VALUES = ["only_me", "group_members", "all_akiba_users"] as const;

export async function saveUserProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const hasIdentity = ["display_name", "username", "bio"].some((field) => formData.has(field));
  const hasPhone = formData.has("phone_number");
  const hasLocation = formData.has("location");
  const hasContactFields = hasPhone || hasLocation;
  const hasEmailVisibility = formData.has("email_visibility");
  const hasPhoneVisibility = formData.has("phone_visibility");
  const hasLocationVisibility = formData.has("location_visibility");
  const hasPrivacyFields = hasEmailVisibility || hasPhoneVisibility || hasLocationVisibility;

  if (hasIdentity) {
    const { data: existing, error } = await supabase
      .from("akiba_profiles")
      .select("user_id,display_name,username,bio")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !existing) back("We couldn't load your profile. Please try again.");

    const displayName = formData.has("display_name")
      ? String(formData.get("display_name") ?? "").trim()
      : existing.display_name ?? "";
    const username = formData.has("username")
      ? String(formData.get("username") ?? "").trim().toLowerCase()
      : existing.username;
    const bio = formData.has("bio")
      ? String(formData.get("bio") ?? "").trim()
      : existing.bio ?? "";

    if (!displayName || displayName.length > 60) back("Display name must be between 1 and 60 characters.");
    if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) back("Choose a valid username.");
    if (bio.length > 160) back("Bio must be 160 characters or fewer.");

    const { error: updateError } = await supabase.from("akiba_profiles").update({
      display_name: displayName,
      username,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    if (updateError) {
      console.error("Profile settings update failed", { code: updateError.code });
      back(updateError.code === "23505" ? "That username is already taken." : "We couldn't save your profile.");
    }
  }

  const avatar = formData.get("avatar");
  const hasNewAvatar = avatar instanceof File && avatar.size > 0;
  const removeAvatar = formData.get("remove_avatar") === "yes";
  if (hasNewAvatar && avatar instanceof File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(avatar.type) || avatar.size > 3 * 1024 * 1024) {
      back("Choose a JPG, PNG or WebP image up to 3 MB.");
    }
    const { data: existing, error: lookupError } = await supabase
      .from("akiba_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
    if (lookupError || !existing) back("We couldn't load your current profile photo.");

    const extension = avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg";
    const path = user.id + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatar, {
      contentType: avatar.type, cacheControl: "3600", upsert: false,
    });
    if (uploadError) back("We couldn't upload your profile photo.");

    const { error: updateError } = await supabase.from("akiba_profiles")
      .update({ avatar_path: path, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (updateError) {
      await supabase.storage.from("avatars").remove([path]);
      back("Your photo uploaded but could not be attached to your profile.");
    }
    if (existing.avatar_path) {
      const { error: cleanupError } = await supabase.storage.from("avatars").remove([existing.avatar_path]);
      if (cleanupError) console.error("Old avatar cleanup failed", { code: cleanupError.name });
    }
  } else if (removeAvatar) {
    const { data: existing, error: lookupError } = await supabase
      .from("akiba_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
    if (lookupError || !existing) back("We couldn't load your current profile photo.");
    const { error: updateError } = await supabase.from("akiba_profiles")
      .update({ avatar_path: null, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (updateError) back("We couldn't remove your profile photo.");
    if (existing.avatar_path) {
      const { error: cleanupError } = await supabase.storage.from("avatars").remove([existing.avatar_path]);
      if (cleanupError) console.error("Avatar removal cleanup failed", { code: cleanupError.name });
    }
  }

  if (hasContactFields) {
    const { data: existing, error: lookupError } = await supabase.from("akiba_user_contacts")
      .select("user_id,phone_number,location").eq("user_id", user.id).maybeSingle();
    if (lookupError) back("We couldn't load your contact details.");

    const phone = hasPhone
      ? String(formData.get("phone_number") ?? "").trim().replace(/[\\s()-]/g, "")
      : existing?.phone_number ?? "";
    const location = hasLocation
      ? String(formData.get("location") ?? "").trim()
      : existing?.location ?? "";
    if (phone && !/^\\+[1-9][0-9]{7,14}$/.test(phone)) back("Enter a valid phone number with country code.");
    if (location.length > 120) back("Location must be 120 characters or fewer.");

    if (phone || location) {
      const values = { phone_number: phone || null, location: location || null, updated_at: new Date().toISOString() };
      const result = existing
        ? await supabase.from("akiba_user_contacts").update(values).eq("user_id", user.id)
        : await supabase.from("akiba_user_contacts").insert({ user_id: user.id, ...values });
      if (result.error) back("We couldn't save your contact details.");
    } else if (existing) {
      const { error } = await supabase.from("akiba_user_contacts").delete().eq("user_id", user.id);
      if (error) back("We couldn't clear your contact details.");
    }
  }

  if (hasPrivacyFields) {
    const { data: existing, error: lookupError } = await supabase.from("akiba_user_privacy_settings")
      .select("email_visibility,phone_visibility,location_visibility").eq("user_id", user.id).maybeSingle();
    if (lookupError) back("We couldn't load your privacy preferences.");

    const emailVisibility = hasEmailVisibility
      ? String(formData.get("email_visibility"))
      : existing?.email_visibility ?? "only_me";
    const phoneVisibility = hasPhoneVisibility
      ? String(formData.get("phone_visibility"))
      : existing?.phone_visibility ?? "only_me";
    const locationVisibility = hasLocationVisibility
      ? String(formData.get("location_visibility"))
      : existing?.location_visibility ?? "only_me";
    if (![emailVisibility, phoneVisibility, locationVisibility].every((value) =>
      VISIBILITY_VALUES.includes(value as typeof VISIBILITY_VALUES[number]))) {
      back("Choose valid privacy settings.");
    }

    const { error } = await supabase.from("akiba_user_privacy_settings").upsert({
      user_id: user.id, email_visibility: emailVisibility, phone_visibility: phoneVisibility,
      location_visibility: locationVisibility, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) back("We couldn't save your privacy preferences.");
  }

  back("Your changes have been saved.", "success");
}

export async function updateAuthEmail(
  _previousState: { status: "idle" | "error" | "success"; message: string; email: string },
  formData: FormData,
): Promise<{ status: "error" | "success"; message: string; email: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address, such as name@example.com.", email };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  if (email === user.email?.toLowerCase()) {
    return { status: "error", message: "That is already the email address on your Akiba account.", email };
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    const code = (error as { code?: string }).code?.toLowerCase() ?? "";
    const message = error.message.toLowerCase();
    console.error("Auth email update request failed", { code: code || "unknown" });

    if (
      ["email_exists", "user_already_exists", "email_address_exists"].includes(code) ||
      /already (?:been )?(?:registered|in use|exists)|email_exists|user already exists/.test(message)
    ) {
      return {
        status: "error",
        message: "The email address is already linked to an Akiba account. Use a different email address.",
        email,
      };
    }
    if (["over_email_send_rate_limit", "email_rate_limit_exceeded"].includes(code) ||
      /rate.?limit|too many requests/.test(message)) {
      return {
        status: "error",
        message: "Too many email-change requests have been made. Wait a few minutes before trying again.",
        email,
      };
    }
    if (["email_address_invalid", "validation_failed"].includes(code) ||
      /invalid email|email address.*invalid/.test(message)) {
      return { status: "error", message: "Akiba Authentication could not accept that email address. Check it for typos.", email };
    }
    if (/fetch failed|network|timeout|connection/.test(message)) {
      return {
        status: "error",
        message: "We couldn't reach the email service. Your sign-in email has not been changed; check your connection and try again.",
        email,
      };
    }
    return {
      status: "error",
      message: "We couldn't send a confirmation request to the address you entered. Your current sign-in email remains unchanged. Please try again or contact support.",
      email,
    };
  }

  return {
    status: "success",
    message: "A confirmation link has been requested for the address you entered. Your current sign-in email remains active until you verify the new address.",
    email,
  };
}

export async function changePassword(formData: FormData) {
  const password = String(formData.get("new_password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (password.length < 10 || password.length > 72) back("Use a password between 10 and 72 characters.");
  if (password !== confirmation) back("The passwords do not match.");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Password update failed", { code: error.code });
    back("We couldn't update your password. Please try again.");
  }
  back("Your password has been updated.", "success");
}

export async function signOutOtherSessions() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    console.error("Other-session sign-out failed", { name: error.name });
    back("We couldn't sign out your other sessions. Please try again.");
  }
  back("Your other sessions have been signed out. This session remains active.", "success");
}
