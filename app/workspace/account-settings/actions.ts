"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AkibaTheme = "light" | "dark" | "system";

export async function saveThemePreference(theme: AkibaTheme): Promise<{ success: boolean; message: string }> {
  if (!["light", "dark", "system"].includes(theme)) {
    return { success: false, message: "Choose a valid appearance preference." };
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, message: "Please sign in to save your preference." };

  const { error } = await supabase.from("akiba_user_settings").upsert({
    user_id: user.id,
    theme,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) {
    console.error("Account theme preference update failed", { code: error.code });
    return { success: false, message: "Your appearance preference could not be saved. Please try again." };
  }
  revalidatePath("/workspace/account-settings");
  return { success: true, message: "Appearance preference saved." };
}

export async function deleteAkibaAccount(formData: FormData): Promise<never> {
  const confirmation = String(formData.get("confirmation") ?? "");
  const acknowledged = String(formData.get("acknowledge") ?? "") === "yes";
  if (confirmation !== "DELETE MY ACCOUNT" || !acknowledged) {
    redirect("/workspace/account-settings?deleteError=" + encodeURIComponent("Confirm the deletion phrase and acknowledge the account deletion terms."));
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  if (!lastSignIn || Date.now() - lastSignIn > 15 * 60 * 1000) {
    redirect("/workspace/account-settings?deleteError=" + encodeURIComponent("For your security, sign out and sign in again before deleting your account."));
  }

  const { data: profile } = await supabase.from("akiba_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
  const service = createServiceClient();
  const { error: prepareError } = await service.rpc("akiba_prepare_account_deletion", { p_user_id: user.id });
  if (prepareError) {
    const message = prepareError.message.toLowerCase().includes("creator")
      ? "You still own a group. Permanently delete an eligible group or deactivate it and wait until the six-month retention process completes."
      : prepareError.message.toLowerCase().includes("admin")
        ? "Step down as Group Admin in every group before deleting your account."
        : prepareError.message.toLowerCase().includes("moderator")
          ? "Your Akiba account has a moderation role. Contact support to have it safely transferred before deletion."
          : "Account deletion could not proceed because some group or financial records still depend on your account. Resolve the listed group requirements and try again.";
    redirect("/workspace/account-settings?deleteError=" + encodeURIComponent(message));
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Akiba Auth account deletion failed after anonymisation", { message: deleteError.message });
    redirect("/workspace/account-settings?deleteError=" + encodeURIComponent("Akiba prepared your account for deletion but could not remove the sign-in account. Your financial history remains safe. Please contact support to complete deletion."));
  }

  if (profile?.avatar_path) {
    const { error: avatarCleanupError } = await service.storage.from("avatars").remove([profile.avatar_path]);
    if (avatarCleanupError) console.error("Deleted account avatar cleanup failed", { message: avatarCleanupError.message });
  }
  await supabase.auth.signOut();
  redirect("/account-deleted");
}
