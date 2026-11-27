"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/redirect";
function fail(message: string, next = "/workspace"): never { redirect("/onboarding?error=" + encodeURIComponent(message) + "&next=" + encodeURIComponent(next)); }
export async function saveProfile(formData: FormData) {
  const username=String(formData.get("username")??"").trim().toLowerCase();
  const displayName=String(formData.get("display_name")??"").trim();
  const bio=String(formData.get("bio")??"").trim();
  const phoneNumber=String(formData.get("phone_number")??"").trim().replace(/[\s()-]/g,"");
  const location=String(formData.get("location")??"").trim();
  const submittedAvatarPath=String(formData.get("avatar_path")??"").trim();
  const removeAvatar=formData.get("remove_avatar")==="yes";
  const next=safeInternalPath(String(formData.get("next")??""),"/workspace");
  if(!/^[a-z][a-z0-9_]{2,19}$/.test(username)) fail("Choose a valid username.",next);
  if(!displayName||displayName.length>60) fail("Display name must be between 1 and 60 characters.",next);
  if(bio.length>160) fail("Your bio must be 160 characters or fewer.",next);
  if(location.length>120) fail("Location must be 120 characters or fewer.",next);
  if(phoneNumber&&!/^\+[1-9][0-9]{7,14}$/.test(phoneNumber)) fail("Enter a valid international phone number, including the country code.",next);
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user) redirect("/login?next="+encodeURIComponent(next));
  const {data:existing,error:existingError}=await supabase.from("akiba_profiles").select("user_id,username,display_name,avatar_path").eq("user_id",user.id).maybeSingle();
  if(existingError) fail("Unable to load your profile. Please try again.",next);
  let avatarPath:string|null=null;
  if(submittedAvatarPath){if(!submittedAvatarPath.startsWith(user.id+"/")||submittedAvatarPath.includes("..")) fail("That profile picture path is not valid.",next);avatarPath=submittedAvatarPath;}
  else if(!removeAvatar) avatarPath=existing?.avatar_path??null;
  const profileValues={user_id:user.id,username,display_name:displayName,avatar_path:avatarPath,bio:bio||null,updated_at:new Date().toISOString()};
  const result=existing?await supabase.from("akiba_profiles").update(profileValues).eq("user_id",user.id):await supabase.from("akiba_profiles").insert(profileValues);
  if(result.error) fail(result.error.code==="23505"?"That username was just claimed. Choose another.":"Unable to save your profile. Please try again.",next);
  if(phoneNumber||location){
    const {data:contact,error}=await supabase.from("akiba_user_contacts").select("user_id").eq("user_id",user.id).maybeSingle();
    if(error) fail("Your profile was saved, but contact details could not be loaded.",next);
    const values={phone_number:phoneNumber||null,location:location||null,updated_at:new Date().toISOString()};
    const write=contact?await supabase.from("akiba_user_contacts").update(values).eq("user_id",user.id):await supabase.from("akiba_user_contacts").insert({user_id:user.id,...values});
    if(write.error) fail("Your profile was saved, but contact details could not be saved.",next);
  } else {
    const {error}=await supabase.from("akiba_user_contacts").delete().eq("user_id",user.id);
    if(error) fail("Your profile was saved, but contact details could not be updated.",next);
  }
  const {error:privacyError}=await supabase.from("akiba_user_privacy_settings").upsert({user_id:user.id},{onConflict:"user_id",ignoreDuplicates:true});
  if(privacyError) fail("Your profile was saved, but privacy defaults could not be initialized.",next);
  if(existing?.avatar_path&&existing.avatar_path!==avatarPath){const {error}=await supabase.storage.from("avatars").remove([existing.avatar_path]);if(error) console.error("Old avatar cleanup failed",{code:error.name});}
  const invitation=next.match(/^\/invitations\/([0-9a-f]{64})\?complete=1&kind=(email|link)$/);
  if(invitation) redirect("/invitations/"+invitation[1]);
  redirect(next);
}
