"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function createGroup(formData: FormData) {
 const name=String(formData.get("name")??"").trim(),purpose=String(formData.get("purpose")??""),currencyCode=String(formData.get("currency_code")??"").trim().toUpperCase(),description=String(formData.get("description")??"").trim();
 if(name.length<1||name.length>80||!["event","goal"].includes(purpose)||!/^[A-Z]{3}$/.test(currencyCode))redirect("/workspace/new?error=Check%20the%20Group%20name%2C%20purpose%20and%20three-letter%20currency%20code");
 const supabase=await createClient();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError||!user)redirect("/login?message=Sign%20in%20to%20create%20a%20Group");
 const {data:profile}=await supabase.from("akiba_profiles").select("username").eq("user_id",user.id).maybeSingle();
 if(!profile)redirect("/onboarding");
 const {data,error}=await supabase.from("akiba_groups").insert({name,purpose,currency_code:currencyCode,description}).select("id").single();
 if(error||!data){console.error("Akiba Group insert failed",{code:error?.code,message:error?.message,details:error?.details});redirect("/workspace/new?error="+encodeURIComponent("The Group could not be created. Please try again. If this continues, contact support."));}
 revalidatePath("/workspace");
 redirect("/workspace/groups/"+data.id);
}
