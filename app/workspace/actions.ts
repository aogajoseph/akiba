"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import nodemailer from "nodemailer";

const allowedTypes: Record<string, string[]> = {
  event: ["birthday", "wedding", "graduation", "funeral_bereavement", "party_celebration", "trip_vacation", "community_event", "meeting", "fundraiser", "other_event"],
  goal: ["rent_housing", "education", "business_investment", "land_property", "vehicle_purchase", "fundraising", "project_purchase", "family_support", "shared_savings", "community_project", "other_goal"],
  chama: ["rotating_savings", "table_banking", "accumulating_savings", "investment_chama", "other_chama"],
};
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
  const image = formData.get("group_image");
  const targetAmount = targetRaw ? Number(targetRaw) : null;
  const validDate = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (name.length < 1 || name.length > 80 || (purpose !== "event" && purpose !== "goal") ||
    !Object.prototype.hasOwnProperty.call(allowedTypes, purpose) || !allowedTypes[purpose].includes(groupType) || currencyCode !== "KES" || description.length > 500 ||
    (targetRaw !== "" && (!Number.isFinite(targetAmount) || (targetAmount ?? 0) <= 0)) ||
    !validDate(eventDate) || !validDate(deadline) || eventLocation.length > 200 ||
    (purpose === "goal" && (eventDate !== "" || eventLocation !== ""))) {
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
    target_amount: targetAmount, event_date: purpose === "event" ? eventDate || null : null, event_location: purpose === "event" ? eventLocation || null : null, deadline: deadline || null,
    contribution_frequency: null, group_image_path: imagePath,
  });

  if (error) {
    if (imagePath) await supabase.storage.from("group-images").remove([imagePath]);
    console.error("Akiba Group insert failed", { code: error.code, message: error.message, details: error.details });
    redirect("/workspace/new?error=" + encodeURIComponent("The Group could not be created. Please try again. If this continues, contact support."));
  }

  revalidatePath("/workspace");
  redirect("/workspace/groups/" + groupId);
}


function isValidGroupDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function updateGroupSettings(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const groupType = String(formData.get("group_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventLocation = String(formData.get("event_location") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const targetRaw = String(formData.get("target_amount") ?? "").trim();
  const currencyCode = String(formData.get("currency_code") ?? "").trim().toUpperCase();
  const image = formData.get("group_image");
  const removeImage = String(formData.get("remove_group_image") ?? "") === "true";
  const targetAmount = targetRaw ? Number(targetRaw) : null;
  const settingsPath = "/workspace/groups/" + groupId + "/settings";

  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace/groups");
  if (name.length < 1 || name.length > 80 || description.length > 500 ||
      !/^[A-Z]{3}$/.test(currencyCode) ||
      (targetRaw !== "" && (!Number.isFinite(targetAmount) || (targetAmount ?? 0) <= 0 || (targetAmount ?? 0) > 999999999999.99)) ||
      !isValidGroupDate(eventDate) || !isValidGroupDate(deadline) ||
      eventLocation.length > 200) {
    redirect(settingsPath + "?error=" + encodeURIComponent("Please review the group details."));
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: group, error: groupError } = await supabase
    .from("akiba_groups")
    .select("id,created_by,purpose,status,group_image_path,currency_code")
    .eq("id", groupId)
    .maybeSingle();
  if (groupError || !group) redirect("/workspace/groups");
  if (group.created_by !== user.id) {
    redirect(settingsPath + "?error=" + encodeURIComponent("Only the Group Creator can update group settings."));
  }

  const { data: membership } = await supabase
    .from("akiba_group_memberships")
    .select("role,status")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "group_creator" || membership.status !== "active") {
    redirect(settingsPath + "?error=" + encodeURIComponent("Only the Group Creator can update group settings."));
  }
  if (group.status !== "active") {
    redirect(settingsPath + "?error=" + encodeURIComponent("Deactivated groups are read-only."));
  }
  if (group.purpose !== "event" && group.purpose !== "goal") {
    redirect(settingsPath + "?error=" + encodeURIComponent("Settings for this group type are not available yet."));
  }
  if (!allowedTypes[group.purpose]?.includes(groupType)) {
    redirect(settingsPath + "?error=" + encodeURIComponent("Choose a valid category for this group."));
  }
  if (group.purpose === "goal" && (eventLocation || eventDate)) {
    redirect(settingsPath + "?error=" + encodeURIComponent("Location and event date apply only to Event groups."));
  }

  let imagePath: string | null = group.group_image_path;
  let uploadedImagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const extension = imageTypes[image.type];
    if (!extension || image.size > 5 * 1024 * 1024) {
      redirect(settingsPath + "?error=" + encodeURIComponent("Choose a JPG, PNG or WebP image smaller than 5 MB."));
    }
    uploadedImagePath = user.id + "/" + groupId + "-" + randomUUID() + "." + extension;
    const { error: uploadError } = await supabase.storage.from("group-images").upload(uploadedImagePath, image, {
      contentType: image.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) {
      console.error("Akiba group settings image upload failed", { message: uploadError.message });
      redirect(settingsPath + "?error=" + encodeURIComponent("The new group image could not be uploaded."));
    }
    imagePath = uploadedImagePath;
  } else if (removeImage) {
    imagePath = null;
  }

  const { error: updateError } = await supabase.rpc("akiba_update_group_settings", {
    p_group_id: groupId,
    p_name: name,
    p_group_type: groupType,
    p_description: description,
    p_event_location: group.purpose === "event" ? eventLocation || null : null,
    p_event_date: group.purpose === "event" ? eventDate || null : null,
    p_deadline: deadline || null,
    p_target_amount: targetAmount,
    p_currency_code: currencyCode,
    p_group_image_path: imagePath,
  });

  if (updateError) {
    if (uploadedImagePath) await supabase.storage.from("group-images").remove([uploadedImagePath]);
    const message = updateError.message.toLowerCase().includes("currency is locked")
      ? "Currency cannot be changed after financial activity or payment setup has started."
      : updateError.message.toLowerCase().includes("only kes")
        ? "KES is currently the only supported currency for group currency changes."
        : updateError.message.toLowerCase().includes("deactivated")
          ? "Deactivated groups are read-only."
          : updateError.message.toLowerCase().includes("only the group creator")
            ? "Only the Group Creator can update group settings."
            : "The group settings could not be saved. Please review the details and try again.";
    redirect(settingsPath + "?error=" + encodeURIComponent(message));
  }

  if (group.group_image_path && group.group_image_path !== imagePath) {
    const { error: cleanupError } = await supabase.storage.from("group-images").remove([group.group_image_path]);
    if (cleanupError) console.error("Akiba old group image cleanup failed", { message: cleanupError.message });
  }

  revalidatePath("/workspace/groups/" + groupId);
  revalidatePath(settingsPath);
  revalidatePath("/workspace/groups");
  redirect(settingsPath + "?saved=1");
}


export async function decideGroupJoinRequest(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^[0-9a-f-]{36}$/i.test(requestId) ||
      (decision !== "approve" && decision !== "reject")) {
    redirect("/workspace/groups");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("akiba_decide_group_join_request", {
    p_request_id: requestId,
    p_decision: decision,
  });
  if (error) {
    const message = error.message.includes("capacity")
      ? "Group capacity reached. Remove an inactive member before approving another request."
      : error.message.includes("Only the Group Creator")
        ? "Only the Group Creator can review membership requests."
        : error.message.includes("already been reviewed")
          ? "This membership request has already been reviewed."
          : "The membership request could not be updated. Please try again.";
    membershipRedirect(groupId, message);
  }

  revalidatePath("/workspace/groups/" + groupId);
  revalidatePath("/workspace/groups/" + groupId + "/membership");
  redirect("/workspace/groups/" + groupId + "/membership?membershipUpdated=" +
    encodeURIComponent(decision === "approve" ? "Membership request approved." : "Membership request declined."));
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
    membershipRedirect(groupId, message);
  }

  revalidatePath("/workspace/groups/" + groupId);
  revalidatePath("/workspace/groups/" + groupId + "/membership");
  redirect("/workspace/groups/" + groupId + "/membership?membershipUpdated=" + encodeURIComponent("Group Admin role updated."));
}


function membershipRedirect(groupId: string, message: string, key = "membershipError"): never {
  redirect("/workspace/groups/" + groupId + "/membership?" + key + "=" + encodeURIComponent(message));
}

function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

async function sendGroupInvitationEmail({
  recipient,
  groupName,
  invitationUrl,
}: {
  recipient: string;
  groupName: string;
  invitationUrl: string;
}) {
  // Support the existing Preview variable spelling while standardizing on SMTP_HOST.
  const host = process.env.SMTP_HOST || process.env.SMTP_Host;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || "Akiba";

  if (!host || !user || !password || !fromEmail || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP is not fully configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const safeGroupName = escapeEmailHtml(groupName);
  const safeFromName = fromName.replace(/[\r\n"]/g, "").trim() || "Akiba";
  try {
    await transporter.sendMail({
      from: { name: safeFromName, address: fromEmail },
      to: recipient,
      subject: "You're invited to join " + groupName + " on Akiba",
      text: "You're invited to join the group \"" + groupName + "\" on Akiba.\n\nAccept your invitation using this secure link:\n" + invitationUrl + "\n\nThis link can be used once and expires in 7 days. If you weren't expecting this invitation, you can ignore this email.",
      html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f6f7f5;font-family:Arial,sans-serif;color:#20251f"><main style="max-width:520px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e6e9e4;border-radius:16px"><p style="font-size:13px;letter-spacing:1.5px;color:#66705f;font-weight:700">AKIBA GROUP INVITATION</p><h1 style="font-size:24px;line-height:1.3">You're invited to join ${safeGroupName}</h1><p>Someone has invited you to join their group on Akiba.</p><p style="margin:28px 0"><a href="${escapeEmailHtml(invitationUrl)}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#245c43;color:#fff;text-decoration:none;font-weight:700">View invitation</a></p><p style="font-size:13px;color:#687168">This secure link can be used once and expires in 7 days. If you weren't expecting this invitation, you can ignore this email.</p></main></body></html>`,
    });
  } finally {
    transporter.close();
  }
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
  if (error) membershipRedirect(groupId,
    error.message.toLowerCase().includes("resolve all pending")
      ? "Settle every pending payment, withdrawal, payout reconciliation, held amount and group balance before deactivating this group."
      : "The group could not be deactivated.");
  revalidatePath("/workspace");
  revalidatePath("/workspace/groups/" + groupId);
  redirect("/workspace?message=Group%20deactivated");
}

export async function reactivateGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.rpc("akiba_reactivate_group", { p_group_id: groupId });
  if (error) membershipRedirect(groupId, "The group could not be reactivated. Only its Group Creator can reactivate a group that has not completed its six-month retention process.");
  revalidatePath("/workspace");
  revalidatePath("/workspace/groups/" + groupId);
  revalidatePath("/workspace/groups/" + groupId + "/membership");
  redirect("/workspace/groups/" + groupId + "/membership?membershipUpdated=" + encodeURIComponent("Group reactivated. Financial matters can now be reviewed and settled."));
}

export async function hardDeleteGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const confirmName = String(formData.get("confirm_name") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace/groups");
  const returnPath = "/workspace/groups/" + groupId + "/delete";
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent(returnPath));
  const { error } = await supabase.rpc("akiba_hard_delete_group", {
    p_group_id: groupId,
    p_confirm_name: confirmName,
  });
  if (error) {
    const message = error.message.toLowerCase().includes("financial history")
      ? "This group has financial history and cannot be permanently deleted. Its financial records must be preserved."
      : error.message.toLowerCase().includes("resolve all pending")
        ? "Settle all pending financial activity, held funds and the group balance before attempting deletion."
        : error.message.toLowerCase().includes("confirmation")
          ? "The group name did not match. Type the exact group name to confirm deletion."
          : "The group could not be permanently deleted. Please refresh and check its eligibility.";
    redirect(returnPath + "?error=" + encodeURIComponent(message));
  }
  revalidatePath("/workspace");
  revalidatePath("/workspace/groups");
  redirect("/workspace/groups/deleted");
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
  const returnTo = String(formData.get("return_to") ?? "") === "/workspace" ? "/workspace" : "/workspace/invitations";
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) redirect(returnTo);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent(returnTo));
  const { data: profile } = await supabase.from("akiba_profiles")
    .select("display_name").eq("user_id", user.id).maybeSingle();
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent(returnTo));
  const { data: groupId, error } = await supabase.rpc("akiba_accept_group_invitation_by_id", { p_invitation_id: invitationId });
  if (error || !groupId) redirect(returnTo + "?error=" + encodeURIComponent(
    error?.message.includes("Group capacity reached") ? "Group capacity reached." : "This invitation is no longer available."
  ));
  revalidatePath("/workspace");
  redirect("/workspace/groups/" + groupId);
}

export async function declineGroupInvitationById(formData: FormData) {
  const invitationId = String(formData.get("invitation_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "") === "/workspace" ? "/workspace" : "/workspace/invitations";
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) redirect(returnTo);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent(returnTo));
  const { error } = await supabase.rpc("akiba_decline_group_invitation_by_id", { p_invitation_id: invitationId });
  if (error) redirect(returnTo + "?error=" + encodeURIComponent("This invitation could not be declined."));
  revalidatePath("/workspace");
  redirect(returnTo + "?message=" + encodeURIComponent("Invitation declined."));
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


export type GroupNotificationMuteResult = {
  success: boolean;
  isMuted: boolean;
  message: string;
};

export async function setGroupNotificationsMuted(
  groupId: string,
  isMuted: boolean,
): Promise<GroupNotificationMuteResult> {
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) {
    return { success: false, isMuted: !isMuted, message: "This group could not be identified." };
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, isMuted: !isMuted, message: "Please sign in to update notification settings." };
  }

  const { error } = await supabase.rpc("akiba_set_group_notification_mute", {
    p_group_id: groupId,
    p_is_muted: isMuted,
  });
  if (error) {
    console.error("Akiba group notification preference update failed", { message: error.message });
    return {
      success: false,
      isMuted: !isMuted,
      message: error.message.includes("Active group membership")
        ? "Only active group members can change this setting."
        : "Notification settings could not be updated. Please try again.",
    };
  }

  revalidatePath("/workspace/groups/" + groupId);
  revalidatePath("/workspace/notifications");
  return {
    success: true,
    isMuted,
    message: isMuted
      ? "Ordinary group activity is muted. Financial and security alerts remain enabled."
      : "Group notifications are now enabled.",
  };
}


export async function markGroupNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notification_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) redirect("/workspace/notifications");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/workspace/notifications"));
  const rpc = supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("akiba_mark_group_notification_read", {
    p_notification_id: notificationId,
  });
  if (error) redirect("/workspace/notifications?error=" + encodeURIComponent("That notification could not be updated."));
  revalidatePath("/workspace/notifications");
  redirect("/workspace/notifications");
}


export type GroupInvitationEmailState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function sendGroupInvitationEmailAction(
  _previousState: GroupInvitationEmailState,
  formData: FormData,
): Promise<GroupInvitationEmailState> {
  const groupId = String(formData.get("group_id") ?? "");
  const email = String(formData.get("recipient_email") ?? "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(groupId) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  let siteUrl: URL;
  try {
    const configuredUrl = process.env.VERCEL_URL
      ? "https://" + process.env.VERCEL_URL
      : process.env.NEXT_PUBLIC_SITE_URL;
    if (!configuredUrl) throw new Error("Missing site URL");
    siteUrl = new URL(configuredUrl);
    if (siteUrl.protocol !== "https:" && siteUrl.hostname !== "localhost") throw new Error("Invalid site URL");
  } catch {
    return { status: "error", message: "Invitations are temporarily unavailable. Please try again later." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in again before sending an invitation." };

  const { data: group } = await supabase.from("akiba_groups")
    .select("name,status").eq("id", groupId).maybeSingle();
  if (!group?.name || group.status !== "active") {
    return { status: "error", message: "This group is not currently accepting invitations." };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const invitationUrl = new URL("/invitations/" + token, siteUrl).toString();
  const { data: prepared, error } = await supabase.rpc("akiba_prepare_group_invitation", {
    p_group_id: groupId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
    p_recipient_email: email,
  });
  const invitation = Array.isArray(prepared) ? prepared[0] : prepared;
  const invitationId = invitation?.invitation_id;
  const wasResent = invitation?.was_resent === true;
  if (error || !invitationId) {
    if (error) console.error("Akiba invitation preparation failed", { code: error.code, message: error.message });
    const message = error?.message.includes("already a group member")
      ? "This person is already a member of the group."
      : error?.code === "23505" && /pending_recipient/i.test(error.message)
        ? "This user has already been invited. The group is awaiting their response."
        : error?.message.toLowerCase().includes("pending invitation") || error?.message.toLowerCase().includes("already invited") || error?.message.toLowerCase().includes("already been invited")
          ? "This user has already been invited. The group is awaiting their response."
        : error?.message.includes("blocked")
        ? "This person is blocked from joining the group."
        : error?.message.includes("capacity")
          ? "Group capacity reached. Remove an inactive member before inviting someone else."
          : "Invitation failed. Please try again.";
    return { status: "error", message };
  }

  try {
    await sendGroupInvitationEmail({ recipient: email, groupName: group.name, invitationUrl });
  } catch (deliveryError) {
    console.error("Akiba invitation email delivery failed", {
      message: deliveryError instanceof Error ? deliveryError.message : "Unknown SMTP error",
    });
    // For a newly-created invite, cancel the undelivered record. For a resend,
    // leave the existing invitation pending; its previous token has been rotated.
    if (!wasResent) {
      const { error: cancelError } = await supabase.rpc("akiba_cancel_group_invitation", {
        p_invitation_id: invitationId,
      });
      if (cancelError) console.error("Akiba failed to cancel an undelivered invitation", { message: cancelError.message });
    }
    return { status: "error", message: wasResent
      ? "The invitation is still pending, but the new email could not be sent. Please try again."
      : "The invitation could not be sent. Please try again." };
  }

  revalidatePath("/workspace/groups/" + groupId + "/membership");
  return {
    status: "success",
    message: wasResent ? "Invitation resent. A new email has been sent." : "Invitation sent. The group is waiting for their response.",
  };
}

export async function requestGroupJoinByLink(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/login?error=" + encodeURIComponent("This group invitation link is invalid."));
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/invitations/" + token));
  const { data: profile } = await supabase.from("akiba_profiles")
    .select("display_name").eq("user_id", user.id).maybeSingle();
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/invitations/" + token));
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.rpc("akiba_request_group_join_by_link", { p_token_hash: tokenHash });
  if (error) {
    const message = error.message.includes("already a member")
      ? "You are already a member of this group."
      : error.message.includes("capacity")
        ? "Group capacity reached. The group cannot accept another membership request right now."
        : error.message.includes("blocked")
          ? "You cannot request to join this group."
          : "Your membership request could not be submitted. Please try again.";
    redirect("/invitations/" + token + "?error=" + encodeURIComponent(message));
  }
  redirect("/invitations/" + token);
}


export async function submitGroupReport(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const returnPath = "/workspace/groups/" + groupId + "/report";
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace/groups");
  const validReasons = new Set([
    "fraud_suspected_scam", "impersonation", "harassment_abusive_behaviour",
    "inappropriate_content", "misleading_group_information",
    "suspicious_financial_activity", "other",
  ]);
  if (!validReasons.has(reason) || description.length > 2000) {
    redirect(returnPath + "?error=" + encodeURIComponent("Please check the report reason and explanation."));
  }

  const files = formData.getAll("evidence").filter((value): value is File => value instanceof File && value.size > 0);
  const allowedEvidence: Record<string, { extension: string; signature: (bytes: Uint8Array) => boolean }> = {
    "image/jpeg": { extension: "jpg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    "image/png": { extension: "png", signature: (b) => b.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10" },
    "image/webp": { extension: "webp", signature: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
    "application/pdf": { extension: "pdf", signature: (b) => String.fromCharCode(...b.slice(0, 5)) === "%PDF-" },
  };
  if (files.length > 5 || files.some((file) =>
    file.size > 5 * 1024 * 1024 || !allowedEvidence[file.type]
  )) {
    redirect(returnPath + "?error=" + encodeURIComponent("Attach up to five JPG, PNG, WebP or PDF files, each no larger than 5 MB."));
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent(returnPath));

  const { data: reportId, error: createError } = await supabase.rpc("akiba_submit_group_report", {
    p_group_id: groupId,
    p_reason: reason,
    p_description: description,
  });
  if (createError || !reportId) {
    const message = createError?.message.includes("submission limit")
      ? "You've reached the report submission limit. Please try again later."
      : createError?.message.includes("already reported")
        ? "You've already reported this group recently."
        : "Your report could not be submitted. Please try again.";
    redirect(returnPath + "?error=" + encodeURIComponent(message));
  }

  const service = createServiceClient();
  const uploadedPaths: string[] = [];
  const evidence: { storage_path: string; file_name: string; mime_type: string; file_size: number }[] = [];
  try {
    for (const file of files) {
      const rule = allowedEvidence[file.type];
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (!rule.signature(bytes)) throw new Error("Evidence file content does not match its declared type");
      const storagePath = reportId + "/" + user.id + "/" + randomUUID() + "." + rule.extension;
      const { error: uploadError } = await service.storage
        .from("akiba-group-report-evidence")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(storagePath);
      evidence.push({
        storage_path: storagePath,
        file_name: file.name.slice(0, 255),
        mime_type: file.type,
        file_size: file.size,
      });
    }
    if (evidence.length) {
      const { error: registerError } = await supabase.rpc("akiba_register_group_report_evidence", {
        p_report_id: reportId,
        p_evidence: evidence,
      });
      if (registerError) throw registerError;
    }
  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await service.storage
        .from("akiba-group-report-evidence").remove(uploadedPaths);
      if (cleanupError) console.error("Akiba report evidence cleanup failed", { message: cleanupError.message });
    }
    const { error: deleteError } = await supabase.rpc("akiba_delete_incomplete_group_report", { p_report_id: reportId });
    if (deleteError) console.error("Akiba incomplete report cleanup failed", { message: deleteError.message });
    console.error("Akiba group report submission failed", {
      message: error instanceof Error ? error.message : "Evidence upload failed",
    });
    redirect(returnPath + "?error=" + encodeURIComponent("Your report could not be completed. Please try again."));
  }

  revalidatePath("/workspace/groups/" + groupId);
  redirect(returnPath + "?submitted=1");
}


function financeActionRedirect(groupId: string, key: "financeError" | "financeUpdated", message: string): never {
  redirect("/workspace/groups/" + groupId + "/finances?" + key + "=" + encodeURIComponent(message));
}

function validFinanceIds(groupId: string, requestId: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(groupId) && /^[0-9a-f-]{36}$/i.test(requestId);
}

export async function createWithdrawalRequest(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const amountKes = Number(String(formData.get("amount_kes") ?? ""));
  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const destinationLabel = String(formData.get("destination_label") ?? "").trim().toUpperCase();
  const reason = String(formData.get("reason") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotency_key") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace/groups");
  if (!Number.isSafeInteger(amountKes) || amountKes < 1 || amountKes > 250000 ||
      recipientName.length < 1 || recipientName.length > 160 ||
      !/^[A-Z0-9][A-Z0-9 _.-]{2,47}$/.test(destinationLabel) ||
      reason.length < 1 || reason.length > 500 ||
      !/^[A-Za-z0-9_-]{8,160}$/.test(idempotencyKey)) {
    financeActionRedirect(groupId, "financeError", "Enter a valid whole-KES amount, recipient, sandbox destination label and purpose.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("akiba_create_sandbox_withdrawal_request", {
    p_group_id: groupId,
    p_recipient_amount_minor: String(amountKes * 100),
    p_recipient_name: recipientName,
    p_destination_label: destinationLabel,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const message = error.message.includes("Only the active Group Creator")
      ? "Only the active Group Creator can request a withdrawal."
      : error.message.includes("leadership is incomplete") || error.message.includes("Exactly one active Group Creator")
        ? "The group needs one active Creator and at least three active Group Admins."
        : error.message.includes("Insufficient available group funds")
          ? "The group does not have enough available funds after existing reservations."
          : error.message.includes("akiba_one_unresolved_withdrawal_per_group") || error.code === "23505"
            ? "This group already has an unresolved withdrawal. Resolve it before creating another."
            : error.message.includes("idempotency key")
              ? "This request reference was already used with different details. Refresh and submit again."
              : error.message.includes("deactivated")
                ? "Withdrawals are unavailable for a deactivated group."
                : "The sandbox withdrawal request could not be created. Refresh and try again.";
    financeActionRedirect(groupId, "financeError", message);
  }

  revalidatePath("/workspace/groups/" + groupId + "/finances");
  revalidatePath("/workspace/groups/" + groupId);
  financeActionRedirect(groupId, "financeUpdated", "Sandbox withdrawal request created. The full group deduction is reserved while Admin approvals are collected. No payment was sent.");
}

export async function decideWithdrawalRequest(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!validFinanceIds(groupId, requestId) ||
      (decision !== "approved" && decision !== "rejected") ||
      (decision === "rejected" && (rejectionReason.length < 1 || rejectionReason.length > 500))) {
    if (/^[0-9a-f-]{36}$/i.test(groupId)) {
      financeActionRedirect(groupId, "financeError", "Provide a valid withdrawal decision and, if rejecting, a reason.");
    }
    redirect("/workspace/groups");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("akiba_decide_withdrawal_request", {
    p_withdrawal_request_id: requestId,
    p_decision: decision,
    p_rejection_reason: decision === "rejected" ? rejectionReason : null,
  });
  if (error) {
    const message = error.message.includes("request-time approval roster")
      ? "Only an active Group Admin included in the original approval roster can decide this withdrawal."
      : error.message.includes("no longer accepting decisions")
        ? "This withdrawal is no longer accepting approvals."
        : error.message.includes("initiator")
          ? "The Group Creator cannot approve their own withdrawal."
          : "Your withdrawal decision could not be saved. Refresh and try again.";
    financeActionRedirect(groupId, "financeError", message);
  }

  revalidatePath("/workspace/groups/" + groupId + "/finances");
  revalidatePath("/workspace/groups/" + groupId);
  financeActionRedirect(groupId, "financeUpdated", decision === "approved"
    ? "Your approval was recorded."
    : "The withdrawal was rejected and its reservation released.");
}

export async function flagWithdrawal(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!validFinanceIds(groupId, requestId) || reason.length < 1 || reason.length > 500) {
    if (/^[0-9a-f-]{36}$/i.test(groupId)) {
      financeActionRedirect(groupId, "financeError", "Provide a short reason for flagging this withdrawal.");
    }
    redirect("/workspace/groups");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("akiba_flag_withdrawal", {
    p_withdrawal_request_id: requestId,
    p_reason: reason,
  });
  if (error) {
    const message = error.message.includes("already have an active flag") ||
      error.message.includes("akiba_one_active_withdrawal_flag_per_member") ||
      error.message.includes("duplicate key")
      ? "You already have an active flag on this withdrawal."
      : error.message.includes("flagging period")
        ? "The two-hour flagging period has ended."
        : "Your withdrawal flag could not be recorded. Refresh and try again.";
    financeActionRedirect(groupId, "financeError", message);
  }

  revalidatePath("/workspace/groups/" + groupId + "/finances");
  financeActionRedirect(groupId, "financeUpdated", "Your flag was recorded. This withdrawal cannot proceed while it remains active.");
}

export async function removeWithdrawalFlag(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const flagId = String(formData.get("flag_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^[0-9a-f-]{36}$/i.test(flagId)) {
    redirect("/workspace/groups");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("akiba_remove_withdrawal_flag", {
    p_flag_id: flagId,
  });
  if (error) {
    const message = error.message.includes("only a flag that you created")
      ? "You can remove only a flag that you created."
      : error.message.includes("flagging period")
        ? "The two-hour flagging period has ended."
        : "This flag could not be removed. It may already be closed.";
    financeActionRedirect(groupId, "financeError", message);
  }

  revalidatePath("/workspace/groups/" + groupId + "/finances");
  financeActionRedirect(groupId, "financeUpdated", "Your flag was removed. The original staging deadline has not changed.");
}

export async function processDueWithdrawalStaging(groupId: string, requestId: string): Promise<boolean> {
  if (!validFinanceIds(groupId, requestId)) return false;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  const { data: membership, error: membershipError } = await supabase
    .from("akiba_group_memberships")
    .select("status")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError || membership?.status !== "active") return false;

  const { data: request, error: requestError } = await supabase
    .from("akiba_withdrawal_requests")
    .select("id,status,staging_deadline_at")
    .eq("id", requestId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (requestError) return false;
  if (!request || request.status !== "staging") return true;
  if (!request.staging_deadline_at || Date.parse(request.staging_deadline_at) > Date.now()) return false;

  const service = createServiceClient();
  const { error: processError } = await service.rpc("akiba_process_due_withdrawal_staging", {
    p_batch_size: 25,
  });
  if (processError) {
    console.error("Akiba due withdrawal staging processing failed", {
      groupId,
      requestId,
      message: processError.message,
    });
    return false;
  }

  revalidatePath("/workspace/groups/" + groupId + "/finances");
  revalidatePath("/workspace/groups/" + groupId);
  return true;
}

export async function cancelWithdrawalRequest(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  if (!validFinanceIds(groupId, requestId)) redirect("/workspace/groups");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("akiba_cancel_withdrawal_request", {
    p_withdrawal_request_id: requestId,
  });
  if (error) {
    const message = error.message.includes("Only the active Group Creator")
      ? "Only the Group Creator who requested this withdrawal may cancel it."
      : error.message.includes("uncertain outcome")
        ? "A payout may already be in progress. The reservation will remain until provider reconciliation."
        : "This withdrawal can no longer be cancelled.";
    financeActionRedirect(groupId, "financeError", message);
  }

  revalidatePath("/workspace/groups/" + groupId + "/finances");
  revalidatePath("/workspace/groups/" + groupId);
  financeActionRedirect(groupId, "financeUpdated", "The withdrawal was cancelled and its reservation released.");
}
