"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

const allowedTypes: Record<string, string[]> = {
  event: ["birthday", "wedding", "graduation", "funeral_bereavement", "party_celebration", "trip_vacation", "community_event", "meeting", "fundraiser", "other_event"],
  goal: ["rent_housing", "education", "business_investment", "land_property", "vehicle_purchase", "family_support", "shared_savings", "community_project", "other_goal"],
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

  if (name.length < 1 || name.length > 80 || !Object.prototype.hasOwnProperty.call(allowedTypes, purpose) ||
    !allowedTypes[purpose].includes(groupType) || !/^[A-Z]{3}$/.test(currencyCode) || description.length > 500 ||
    (targetRaw !== "" && (!Number.isFinite(targetAmount) || (targetAmount ?? 0) <= 0)) ||
    !validDate(eventDate) || !validDate(deadline) || eventLocation.length > 200 ||
    false) {
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


type GroupCustomFieldInput = {
  label: string;
  field_type: "text" | "number" | "date" | "url";
  value: string;
};

function isValidGroupDate(value: string) {
  if (!value) return true;
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateGroupCustomFields(value: string): GroupCustomFieldInput[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > 10) return null;

  const labels = new Set<string>();
  const fields: GroupCustomFieldInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
    const fieldType = candidate.field_type;
    const fieldValue = typeof candidate.value === "string" ? candidate.value.trim() : "";
    if (!label || label.length > 40 || !fieldValue || fieldValue.length > 500 ||
        !["text", "number", "date", "url"].includes(String(fieldType))) return null;
    const normalizedLabel = label.toLocaleLowerCase();
    if (labels.has(normalizedLabel)) return null;
    labels.add(normalizedLabel);

    if (fieldType === "number" && !/^-?\\d+(?:\\.\\d{1,2})?$/.test(fieldValue)) return null;
    if (fieldType === "date" && !isValidGroupDate(fieldValue)) return null;
    if (fieldType === "url") {
      try {
        const url = new URL(fieldValue);
        if (!["http:", "https:"].includes(url.protocol)) return null;
      } catch {
        return null;
      }
    }
    fields.push({
      label,
      field_type: fieldType as GroupCustomFieldInput["field_type"],
      value: fieldValue,
    });
  }
  return fields;
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
  const customFields = validateGroupCustomFields(String(formData.get("custom_fields") ?? "[]"));
  const image = formData.get("group_image");
  const removeImage = String(formData.get("remove_group_image") ?? "") === "true";
  const targetAmount = targetRaw ? Number(targetRaw) : null;
  const settingsPath = "/workspace/groups/" + groupId + "/settings";

  if (!/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/workspace/groups");
  if (name.length < 1 || name.length > 80 || description.length > 500 ||
      !/^[A-Z]{3}$/.test(currencyCode) ||
      (targetRaw !== "" && (!Number.isFinite(targetAmount) || (targetAmount ?? 0) <= 0 || (targetAmount ?? 0) > 999999999999.99)) ||
      !isValidGroupDate(eventDate) || !isValidGroupDate(deadline) ||
      eventLocation.length > 200 || !customFields) {
    redirect(settingsPath + "?error=" + encodeURIComponent("Please review the group details and additional fields."));
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
    p_custom_fields: customFields,
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
            : updateError.message.toLowerCase().includes("additional detail")
              ? updateError.message
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

export async function acceptGroupInviteLink(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/login?error=" + encodeURIComponent("This group invitation link is invalid."));
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=" + encodeURIComponent("/invitations/" + token));
  const { data: profile } = await supabase.from("akiba_profiles")
    .select("display_name").eq("user_id", user.id).maybeSingle();
  if (!profile?.display_name?.trim()) redirect("/onboarding?next=" + encodeURIComponent("/invitations/" + token));
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: groupId, error } = await supabase.rpc("akiba_join_group_by_link", { p_token_hash: tokenHash });
  if (error || !groupId) {
    const message = error?.message.includes("Group capacity reached")
      ? "Group capacity reached. Ask a group member to try again when a space becomes available."
      : error?.message.includes("blocked")
        ? "You cannot join this group."
        : "This group invitation link is no longer available.";
    redirect("/invitations/" + token + "?error=" + encodeURIComponent(message));
  }
  redirect("/workspace/groups/" + groupId);
}
