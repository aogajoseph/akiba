"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const allowedTypes: Record<string, string[]> = {
  event: ["birthday", "wedding", "graduation", "funeral_bereavement", "party_celebration", "trip_vacation", "community_event", "meeting", "fundraiser", "other_event"],
  goal: ["rent_housing", "education", "business_investment", "land_property", "vehicle_purchase", "family_support", "shared_savings", "community_project", "other_goal"],
  chama: ["rotating_savings", "table_banking", "accumulating_savings", "investment_chama", "other_chama"],
};
const allowedFrequencies = ["one_time", "weekly", "biweekly", "monthly", "quarterly", "annually"];
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "");
  const groupType = String(formData.get("group_type") ?? "");
  const currencyCode = String(formData.get("currency_code") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const targetRaw = String(formData.get("target_amount") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const eventLocation = String(formData.get("event_location") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const frequency = String(formData.get("contribution_frequency") ?? "").trim();
  const image = formData.get("group_image");
  const chamaFrequencyRequired = purpose === "chama" && ["rotating_savings", "table_banking", "accumulating_savings"].includes(groupType);
  const targetAmount = targetRaw ? Number(targetRaw) : null;
  const validDate = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (name.length < 1 || name.length > 80 || !Object.prototype.hasOwnProperty.call(allowedTypes, purpose) ||
    !allowedTypes[purpose].includes(groupType) || !/^[A-Z]{3}$/.test(currencyCode) || description.length > 500 ||
    (targetRaw !== "" && (!Number.isFinite(targetAmount) || (targetAmount ?? 0) <= 0)) ||
    !validDate(eventDate) || !validDate(deadline) || eventLocation.length > 200 ||
    (frequency !== "" && !allowedFrequencies.includes(frequency)) || (chamaFrequencyRequired && !frequency)) {
    redirect("/workspace/new?error=" + encodeURIComponent("Please review the required fields and make sure the group details are valid."));
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?message=Sign%20in%20to%20create%20a%20Group");
  const { data: profile } = await supabase.from("akiba_profiles").select("username").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const groupId = randomUUID();
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const extension = imageTypes[image.type];
    if (!extension || image.size > 5 * 1024 * 1024) {
      redirect("/workspace/new?error=" + encodeURIComponent("Choose a JPG, PNG or WebP image smaller than 5 MB."));
    }
    imagePath = user.id + "/" + groupId + "." + extension;
    const { error: uploadError } = await supabase.storage.from("group-images").upload(imagePath, image, {
      contentType: image.type, upsert: false, cacheControl: "3600",
    });
    if (uploadError) {
      console.error("Akiba group image upload failed", { message: uploadError.message });
      redirect("/workspace/new?error=" + encodeURIComponent("The group image could not be uploaded. Please try another image."));
    }
  }

  const { error } = await supabase.from("akiba_groups").insert({
    id: groupId, name, purpose, group_type: groupType, currency_code: currencyCode, description,
    target_amount: targetAmount, event_date: eventDate || null, event_location: purpose === "event" ? eventLocation || null : null, deadline: deadline || null,
    contribution_frequency: frequency || null, group_image_path: imagePath,
  });

  if (error) {
    if (imagePath) await supabase.storage.from("group-images").remove([imagePath]);
    console.error("Akiba Group insert failed", { code: error.code, message: error.message, details: error.details });
    redirect("/workspace/new?error=" + encodeURIComponent("The Group could not be created. Please try again. If this continues, contact support."));
  }

  revalidatePath("/workspace");
  redirect("/workspace/groups/" + groupId);
}


export async function setGroupAdmin(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^[0-9a-f-]{36}$/i.test(userId) ||
      (action !== "appoint" && action !== "demote")) {
    redirect("/workspace?error=" + encodeURIComponent("Invalid Group Admin change."));
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("akiba_set_group_admin", {
    p_group_id: groupId,
    p_user_id: userId,
    p_action: action,
  });
  if (error) {
    const message = error.message.includes("plan Group Admin limit")
      ? "This group has reached its Group Admin allowance."
      : error.message.includes("unresolved")
        ? "Group Admins cannot change while a withdrawal is being processed."
        : "The Group Admin change could not be completed. Check that the person is an active member.";
    redirect("/workspace/groups/" + groupId + "?membershipError=" + encodeURIComponent(message));
  }

  revalidatePath("/workspace/groups/" + groupId);
  redirect("/workspace/groups/" + groupId + "?membershipUpdated=1");
}


function membershipRedirect(groupId: string, message: string, key = "membershipError"): never {
  redirect("/workspace/groups/" + groupId + "/membership?" + key + "=" + encodeURIComponent(message));
}

export async function createGroupInvitation(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const email = String(formData.get("recipient_email") ?? "").trim().toLowerCase();
  const username = String(formData.get("recipient_username") ?? "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || (email && username)) {
    membershipRedirect(groupId, "Enter either an email address or an Akiba username.");
  }

  const siteUrl = process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) membershipRedirect(groupId, "Invitations are temporarily unavailable.");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/groups/" + groupId + "/membership"));

  const { error } = await supabase.rpc("akiba_create_group_invitation", {
    p_group_id: groupId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
    p_recipient_email: email || null,
    p_recipient_username: username || null,
  });
  if (error) {
    const message = error.message.includes("Group capacity reached")
      ? "Group capacity reached."
      : error.code === "23505"
        ? "A pending invitation already exists for this person."
        : error.message.includes("already a group member")
        ? "This person is already a group member."
        : error.message.includes("blocked from joining")
          ? "This person is blocked from joining the group."
          : error.message.includes("already exists")
            ? "A pending invitation already exists for this person."
            : error.message.includes("No Akiba account")
              ? "No Akiba account was found for that username."
              : "The invitation could not be created. Please try again.";
    membershipRedirect(groupId, message);
  }

  const store = await cookies();
  store.set("akiba_group_invite_" + groupId, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/workspace/groups/" + groupId + "/membership",
    maxAge: 5 * 60,
  });
  redirect("/workspace/groups/" + groupId + "/membership?inviteCreated=1");
}

export async function acceptGroupInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/login?error=" + encodeURIComponent("This invitation link is invalid."));
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/invitations/" + token));
  const { data: profile } = await supabase.from("akiba_profiles")
    .select("display_name").eq("user_id", user.id).maybeSingle();
  if (!profile?.display_name?.trim()) {
    redirect("/onboarding?next=" + encodeURIComponent("/invitations/" + token));
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: groupId, error } = await supabase.rpc("akiba_accept_group_invitation", { p_token_hash: tokenHash });
  if (error) {
    const message = error.message.includes("Group capacity reached")
      ? "Group capacity reached. Ask a group member to try again when a space becomes available."
      : error.message.includes("another Akiba account") || error.message.includes("email address this invitation")
        ? error.message
        : error.message.includes("blocked")
          ? "You cannot join this group."
          : "This invitation is no longer available. It may have expired, been cancelled or already used.";
    redirect("/invitations/" + token + "?error=" + encodeURIComponent(message));
  }
  if (!groupId) redirect("/invitations/" + token + "?error=" + encodeURIComponent("This invitation has expired."));
  redirect("/workspace/groups/" + groupId);
}

export async function declineGroupInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/login?error=" + encodeURIComponent("This invitation link is invalid."));
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/invitations/" + token));
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.rpc("akiba_decline_group_invitation", { p_token_hash: tokenHash });
  if (error) redirect("/invitations/" + token + "?error=" + encodeURIComponent("This invitation could not be declined. It may no longer be available."));
  redirect("/workspace?message=" + encodeURIComponent("Invitation declined."));
}

export async function leaveGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.rpc("akiba_leave_group", { p_group_id: groupId });
  if (error) membershipRedirect(groupId, error.message.includes("Group Creator")
    ? "The Group Creator cannot leave the group."
    : error.message.includes("unresolved")
      ? "Group Admins cannot leave while a withdrawal is unresolved."
      : "You could not leave this group. Please try again.");
  revalidatePath("/workspace");
  redirect("/workspace?message=" + encodeURIComponent("You have left the group."));
}

export async function removeGroupMember(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const block = String(formData.get("block") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^[0-9a-f-]{36}$/i.test(userId)) redirect("/workspace");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.rpc("akiba_remove_group_member", {
    p_group_id: groupId, p_user_id: userId, p_block: block,
  });
  if (error) membershipRedirect(groupId, error.message.includes("unresolved")
    ? "Group Admins cannot be removed while a withdrawal is unresolved."
    : "The member could not be removed. Please try again.");
  revalidatePath("/workspace/groups/" + groupId);
  redirect("/workspace/groups/" + groupId + "/membership?membershipUpdated=" + (block ? "Member blocked." : "Member removed."));
}

export async function unblockGroupMember(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^[0-9a-f-]{36}$/i.test(userId)) redirect("/workspace");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.rpc("akiba_unblock_group_member", { p_group_id: groupId, p_user_id: userId });
  if (error) membershipRedirect(groupId, "The block could not be removed.");
  redirect("/workspace/groups/" + groupId + "/membership?membershipUpdated=Member unblocked.");
}

export async function deactivateGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.rpc("akiba_deactivate_group", { p_group_id: groupId });
  if (error) membershipRedirect(groupId, error.message.includes("Resolve outstanding withdrawals")
    ? "Resolve outstanding withdrawals before deactivating the group."
    : "The group could not be deactivated.");
  revalidatePath("/workspace");
  redirect("/workspace?message=Group%20deactivated");
}


export async function cancelGroupInvitation(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const invitationId = String(formData.get("invitation_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^[0-9a-f-]{36}$/i.test(invitationId)) redirect("/workspace");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.rpc("akiba_cancel_group_invitation", { p_invitation_id: invitationId });
  if (error) membershipRedirect(groupId, "The invitation could not be cancelled.");
  redirect("/workspace/groups/" + groupId + "/membership?membershipUpdated=" + encodeURIComponent("Invitation cancelled."));
}


export async function acceptGroupInvitationById(formData: FormData) {
  const invitationId = String(formData.get("invitation_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) redirect("/workspace/invitations");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/invitations"));
  const { data: profile } = await supabase.from("akiba_profiles")
    .select("display_name").eq("user_id", user.id).maybeSingle();
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/workspace/invitations"));
  const { data: groupId, error } = await supabase.rpc("akiba_accept_group_invitation_by_id", { p_invitation_id: invitationId });
  if (error || !groupId) redirect("/workspace/invitations?error=" + encodeURIComponent(
    error?.message.includes("Group capacity reached") ? "Group capacity reached." : "This invitation is no longer available."
  ));
  redirect("/workspace/groups/" + groupId);
}

export async function declineGroupInvitationById(formData: FormData) {
  const invitationId = String(formData.get("invitation_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) redirect("/workspace/invitations");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/invitations"));
  const { error } = await supabase.rpc("akiba_decline_group_invitation_by_id", { p_invitation_id: invitationId });
  if (error) redirect("/workspace/invitations?error=" + encodeURIComponent("This invitation could not be declined."));
  redirect("/workspace/invitations?message=" + encodeURIComponent("Invitation declined."));
}


export async function stepDownGroupAdmin(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.rpc("akiba_step_down_group_admin", { p_group_id: groupId });
  if (error) membershipRedirect(groupId, error.message.includes("unresolved")
    ? "You cannot step down while a withdrawal is unresolved."
    : "Your Group Admin role could not be changed.");
  revalidatePath("/workspace/groups/" + groupId);
  redirect("/workspace/groups/" + groupId + "/membership?membershipUpdated=" + encodeURIComponent("You are now a regular Member."));
}
