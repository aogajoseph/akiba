"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function back(message: string, kind: "error" | "success" = "error"): never {
  redirect("/workspace/profile?" + kind + "=" + encodeURIComponent(message));
}

export async function saveUserProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();
  const phone = String(formData.get("phone_number") ?? "").trim().replace(/[\s()-]/g, "");
  const location = String(formData.get("location") ?? "").trim();
  const emailVisibility = String(formData.get("email_visibility") ?? "only_me");
  const phoneVisibility = String(formData.get("phone_visibility") ?? "only_me");
  const locationVisibility = String(formData.get("location_visibility") ?? "only_me");
  const hasIdentity = formData.has("display_name");
  const hasContactFields = formData.has("phone_number") || formData.has("location");
  const hasPrivacyFields = formData.has("email_visibility") || formData.has("phone_visibility") || formData.has("location_visibility");

  if (hasIdentity && (!displayName || displayName.length > 60)) back("Display name must be between 1 and 60 characters.");
  if (hasIdentity && !/^[a-z][a-z0-9_]{2,19}$/.test(username)) back("Choose a valid username.");
  if (hasIdentity && bio.length > 160) back("Bio must be 160 characters or fewer.");
  if (hasContactFields && phone && !/^\+[1-9][0-9]{7,14}$/.test(phone)) back("Enter a valid phone number with country code.");
  if (hasContactFields && location.length > 120) back("Location must be 120 characters or fewer.");
  const audiences = ["only_me", "group_members", "all_akiba_users"];
  if (hasPrivacyFields && ![emailVisibility, phoneVisibility, locationVisibility].every((value) => audiences.includes(value))) back("Choose valid privacy settings.");

  if (hasIdentity) {
    const { error } = await supabase.from("akiba_profiles").update({
      display_name: displayName, username, bio: bio || null, updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    if (error) {
      console.error("Profile settings update failed", { code: error.code });
      back(error.code === "23505" ? "That username is already taken." : "We couldn't save your profile.");
    }
  }

  const removeAvatar = formData.get("remove_avatar") === "yes";
  if (removeAvatar && !formData.get("avatar")) {
    const { data: previous } = await supabase.from("akiba_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
    const { error } = await supabase.from("akiba_profiles").update({ avatar_path: null, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (error) back("We couldn't remove your profile photo.");
    if (previous?.avatar_path) await supabase.storage.from("avatars").remove([previous.avatar_path]);
  }
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(avatar.type) || avatar.size > 3 * 1024 * 1024) back("Choose a JPG, PNG or WebP image up to 3 MB.");
    const extension = avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg";
    const path = user.id + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatar, { contentType: avatar.type, cacheControl: "3600", upsert: false });
    if (uploadError) back("We couldn't upload your profile photo.");
    const { data: previous } = await supabase.from("akiba_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
    const { error: updateError } = await supabase.from("akiba_profiles").update({ avatar_path: path, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (updateError) { await supabase.storage.from("avatars").remove([path]); back("Your photo uploaded but could not be attached to your profile."); }
    if (previous?.avatar_path) await supabase.storage.from("avatars").remove([previous.avatar_path]);
  }

  if (hasContactFields) {
    const { data: existing, error: lookupError } = await supabase.from("akiba_user_contacts").select("user_id").eq("user_id", user.id).maybeSingle();
    if (lookupError) back("We couldn't load your contact details.");
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
    const { error } = await supabase.from("akiba_user_privacy_settings").upsert({
      user_id: user.id, email_visibility: emailVisibility, phone_visibility: phoneVisibility,
      location_visibility: locationVisibility, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) back("We couldn't save your privacy settings.");
  }
  back("Your profile and settings have been saved.", "success");
}

export async function updateAuthEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("Enter a valid email address.");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  if (email === user.email?.toLowerCase()) back("That is already your current email address.");
  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    console.error("Auth email update request failed", { code: error.code });
    back("We couldn't start the email change. Check the address and try again.");
  }
  back("A confirmation link has been sent. Your sign-in email changes only after verification.", "success");
}
