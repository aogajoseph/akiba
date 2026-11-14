"use server";

import { createHash } from "node:crypto";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/redirect";

function fail(message: string, next = "/workspace"): never {
  redirect("/onboarding?error=" + encodeURIComponent(message) + "&next=" + encodeURIComponent(next));
}

export async function saveProfile(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const rawPhone = String(formData.get("phone_number") ?? "").trim();
  const phoneNumber = rawPhone.replace(/[\s()-]/g, "");
  const submittedAvatarPath = String(formData.get("avatar_path") ?? "").trim();
  const removeAvatar = formData.get("remove_avatar") === "yes";
  const next = safeInternalPath(String(formData.get("next") ?? ""), "/workspace");

  if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) fail("Choose a valid username.", next);
  if (!displayName || displayName.length > 60) fail("Display name must be between 1 and 60 characters.", next);
  if (bio.length > 160) fail("Your bio must be 160 characters or fewer.", next);
  if (phoneNumber && !/^\+[1-9][0-9]{7,14}$/.test(phoneNumber)) fail("Enter a valid international phone number, including the country code.", next);

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent(next));

  let avatarPath: string | null = null;
  const { data: existing, error: existingError } = await supabase
    .from("akiba_profiles")
    .select("user_id, username, display_name, avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("Akiba profile lookup failed", { code: existingError.code });
    fail("Unable to load your profile. Please try again.", next);
  }

  if (submittedAvatarPath) {
    if (!submittedAvatarPath.startsWith(user.id + "/") || submittedAvatarPath.includes("..")) {
      fail("That profile picture path is not valid.", next);
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
    fail(result.error.code === "23505" ? "That username was just claimed. Choose another." : "Unable to save your profile. Please try again.", next);
  }

  if (phoneNumber) {
    const { data: existingContact, error: contactLookupError } = await supabase
      .from("akiba_user_contacts")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (contactLookupError) {
      console.error("Akiba contact lookup failed", { code: contactLookupError.code });
      fail("Your profile was saved, but we couldn't save the phone number. Please try again.", next);
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
      fail("Your profile was saved, but we couldn't save the phone number. Please try again.", next);
    }
  } else {
    const { error: contactError } = await supabase.from("akiba_user_contacts").delete().eq("user_id", user.id);
    if (contactError) {
      console.error("Akiba contact removal failed", { code: contactError.code });
      fail("Your profile was saved, but we couldn't update the phone number. Please try again.", next);
    }
  }

  if (existing?.avatar_path && existing.avatar_path !== avatarPath) {
    const { error: removeError } = await supabase.storage.from("avatars").remove([existing.avatar_path]);
    if (removeError) console.error("Akiba old avatar cleanup failed", { code: removeError.name });
  }

  // When onboarding began from a group invitation, finish the join now.
  // The invitation page supplied this continuation only after the user
  // opened the invite and chose to create an account to join.
  const invitationContinuation = next.match(/^\/invitations\/([0-9a-f]{64})\?complete=1&kind=(email|link)$/);
  if (invitationContinuation) {
    const [, token, kind] = invitationContinuation;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rpcName = kind === "link" ? "akiba_join_group_by_link" : "akiba_accept_group_invitation";
    const { data: groupId, error: joinError } = await supabase.rpc(rpcName, { p_token_hash: tokenHash });
    if (joinError || !groupId) {
      const message = joinError?.message.includes("Group capacity reached")
        ? "Group capacity reached. Ask a group member to try again when a space becomes available."
        : joinError?.message.includes("blocked")
          ? "You cannot join this group."
          : "Your profile is ready, but the invitation could not be accepted. Please review the invitation and try again.";
      redirect("/invitations/" + token + "?error=" + encodeURIComponent(message));
    }
    await supabase.auth.updateUser({ data: { akiba_pending_invitation_token: null } });
    redirect("/workspace/groups/" + groupId);
  }

  redirect(next);
}
