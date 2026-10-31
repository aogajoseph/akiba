"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function markReturning() {
 const store = await cookies();
 store.set("akiba_returning", "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
function field(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
export async function signIn(formData: FormData) {
 const email=field(formData,"email").toLowerCase(), password=String(formData.get("password")??"");
 if(!email||!password) redirect("/login?error=Enter%20your%20email%20and%20password");
 const supabase=await createClient();
 const {error}=await supabase.auth.signInWithPassword({email,password});
 if(error){
   console.error("Akiba sign-in failure",{code:error.code,message:error.message});
   let message = error.code === "email_not_confirmed"
     ? "Please confirm your email before signing in."
     : error.code === "invalid_credentials"
       ? "Incorrect email or password."
       : "Unable to sign in. Please try again.";
   if (error.code === "invalid_credentials") {
     const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
     const secret = process.env.SUPABASE_SECRET_KEY;
     if (url && secret) {
       try {
         // The lookup RPC is restricted to service_role and is called only
         // after a failed password sign-in, never from the browser.
         const admin = createAdminClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
         const { data: exists, error: lookupError } = await admin.rpc("akiba_email_exists", { check_email: email });
         if (lookupError) console.error("Akiba account lookup failed", { code: lookupError.code });
         else if (exists === false) message = "No account found for this email address. Please create an account.";
       } catch {
         console.error("Akiba account lookup unavailable");
       }
     } else {
       console.error("Akiba account lookup not configured");
     }
   }
   redirect("/login?error=" + encodeURIComponent(message));
 }
 await markReturning();
 redirect("/workspace");
}
export async function signUp(formData: FormData) {
 const email=field(formData,"email").toLowerCase(),password=String(formData.get("password")??"");
 if(!email||password.length<8) redirect("/signup?error=Enter%20a%20valid%20email%20and%20a%20password%20of%20at%20least%208%20characters");
 const supabase=await createClient();
 const site=process.env.NEXT_PUBLIC_SITE_URL;
 if(!site){console.error("Akiba NEXT_PUBLIC_SITE_URL is missing");redirect("/signup?error=Signup%20is%20temporarily%20unavailable");}
 const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:new URL("/auth/callback",site).toString()}});
 if(error){console.error("Akiba signup failure",{code:error.code,message:error.message});redirect("/signup?error="+encodeURIComponent(error.code==="user_already_exists"?"An account with this email already exists. Please sign in.":"Unable to create account. Please try again."));}
 await markReturning();
 if(data.session) redirect("/onboarding");
 redirect("/login?message="+encodeURIComponent("We've sent you a confirmation email. Verify your email address to continue."));
}
export async function signOut(){const supabase=await createClient();await supabase.auth.signOut();await markReturning();redirect("/login?message=You%20have%20signed%20out.");}

export async function requestPasswordReset(formData: FormData) {
 const email = field(formData, "email").toLowerCase();
 if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) redirect("/forgot-password?error=" + encodeURIComponent("Enter a valid email address."));
 const site = process.env.NEXT_PUBLIC_SITE_URL;
 if (!site) {
   console.error("Akiba NEXT_PUBLIC_SITE_URL is missing for password recovery");
   redirect("/forgot-password?error=" + encodeURIComponent("Password recovery is temporarily unavailable."));
 }
 const supabase = await createClient();
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret = process.env.SUPABASE_SECRET_KEY;
 let accountExists: boolean | null = null;

 // This server-side lookup supports the requested explicit account feedback.
 // Never expose the privileged key to the browser. If lookup is unavailable,
 // fall back to privacy-preserving copy rather than guessing.
 if (url && secret) {
   try {
     const admin = createAdminClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
     const { data, error: lookupError } = await admin.rpc("akiba_email_exists", { check_email: email });
     if (lookupError) console.error("Akiba password recovery account lookup failed", { code: lookupError.code });
     else if (typeof data === "boolean") accountExists = data;
   } catch {
     console.error("Akiba password recovery account lookup unavailable");
   }
 } else {
   console.error("Akiba password recovery account lookup not configured");
 }

 if (accountExists === false) {
   redirect("/forgot-password?message=" + encodeURIComponent("No account found for this email address. Check the address or create an Akiba account."));
 }

 const callback = new URL("/auth/callback", site);
 callback.searchParams.set("type", "recovery");
 callback.searchParams.set("flow", "recovery");
 const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
 if (error) {
   console.error("Akiba password recovery request failed", { code: error.code });
   redirect("/forgot-password?error=" + encodeURIComponent("We couldn't send a password reset link. Please try again."));
 }

 if (accountExists === true) {
   redirect("/forgot-password?message=" + encodeURIComponent("Password reset link sent. Check your inbox and spam folder."));
 }

 // Preserve privacy if the account lookup was unavailable or inconclusive.
 redirect("/forgot-password?message=" + encodeURIComponent("If an account is registered with this email address, you'll receive instructions to reset your password. Check your inbox and spam folder."));
}

export async function updatePassword(formData: FormData) {
 const password = String(formData.get("password") ?? "");
 const confirmation = String(formData.get("confirmPassword") ?? "");
 if (password.length < 8) redirect("/reset-password?error=" + encodeURIComponent("Use at least 8 characters."));
 if (password !== confirmation) redirect("/reset-password?error=" + encodeURIComponent("Passwords do not match."));
 const supabase = await createClient();
 const { data: { user }, error: userError } = await supabase.auth.getUser();
 if (userError || !user) redirect("/forgot-password?error=" + encodeURIComponent("Your reset link has expired. Request another."));
 const { error } = await supabase.auth.updateUser({ password });
 if (error) {
   console.error("Akiba password update failed", { code: error.code });
   redirect("/reset-password?error=" + encodeURIComponent("Unable to update your password. Request a new reset link if this continues."));
 }
 await supabase.auth.signOut();
 redirect("/login?message=" + encodeURIComponent("Password updated. Sign in with your new password."));
}
