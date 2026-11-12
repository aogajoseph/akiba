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

function safeInternalPath(value: string, fallback = "/workspace") {
 const candidate = String(value ?? "").trim();
 if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\\\")) return fallback;
 try {
   const parsed = new URL(candidate, "https://akiba.invalid");
   return parsed.origin === "https://akiba.invalid" ? candidate : fallback;
 } catch {
   return fallback;
 }
}

function isValidEmail(email: string) {
 const at = email.indexOf("@");
 return email.length <= 320 && !email.includes(" ") && at > 0 && at === email.lastIndexOf("@") && email.lastIndexOf(".") > at + 1 && !email.endsWith(".");
}
export async function signIn(formData: FormData) {
 const email=field(formData,"email").toLowerCase(), password=String(formData.get("password")??"");
 const next = safeInternalPath(field(formData, "next"));
 if(!email||!password) redirect("/login?error=Enter%20your%20email%20and%20password&next=" + encodeURIComponent(next));
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
   redirect("/login?error=" + encodeURIComponent(message) + "&next=" + encodeURIComponent(next));
 }
 await markReturning();
 redirect(next);
}
export async function signUp(formData: FormData) {
 const email=field(formData,"email").toLowerCase(),password=String(formData.get("password")??"");
 const next = safeInternalPath(field(formData, "next"), "/onboarding");
 if(!isValidEmail(email)||password.length<8) redirect("/signup?error=Enter%20a%20valid%20email%20and%20a%20password%20of%20at%20least%208%20characters&next=" + encodeURIComponent(next));
 const supabase=await createClient();
 const site=process.env.NEXT_PUBLIC_SITE_URL;
 if(!site){console.error("Akiba NEXT_PUBLIC_SITE_URL is missing");redirect("/signup?error=Signup%20is%20temporarily%20unavailable");}
 const callback = new URL("/auth/callback", site);
 callback.searchParams.set("next", next);
 const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callback.toString()}});
 if(error){console.error("Akiba signup failure",{code:error.code,message:error.message});redirect("/signup?error="+encodeURIComponent(error.code==="user_already_exists"?"An account with this email already exists. Please sign in.":"Unable to create account. Please try again.")+"&next="+encodeURIComponent(next));}
 await markReturning();
 if(data.session) redirect(next);
 redirect("/login?message="+encodeURIComponent("We've sent you a confirmation email. Verify your email address to continue.")+"&next="+encodeURIComponent(next));
}
export async function signOut(){const supabase=await createClient();await supabase.auth.signOut();await markReturning();redirect("/login?message=You%20have%20signed%20out.");}

export async function preparePasswordReset(emailInput: string) {
 const email = String(emailInput ?? "").trim().toLowerCase();
 if (!isValidEmail(email)) {
   return { status: "error" as const, message: "Enter a valid email address." };
 }
 const site = process.env.NEXT_PUBLIC_SITE_URL;
 if (!site) {
   console.error("Akiba NEXT_PUBLIC_SITE_URL is missing for password recovery");
   return { status: "error" as const, message: "Password recovery is temporarily unavailable." };
 }
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret = process.env.SUPABASE_SECRET_KEY;
 if (!url || !secret) {
   console.error("Akiba password recovery admin configuration is missing");
   return { status: "error" as const, message: "Password recovery is temporarily unavailable." };
 }
 const admin = createAdminClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
 let accountExists: boolean | null = null;

 // Apply a server-side per-email limit before account lookup or email delivery.
 // Supabase Auth's own endpoint/IP limits should remain enabled as a second layer.
 let rateLimitAllowed: boolean | null = null;
 try {
   const { data, error: limitError } = await admin.rpc("akiba_consume_password_reset_limit", { check_email: email });
   if (limitError) {
     console.error("Akiba password recovery rate limit failed", { code: limitError.code });
   } else if (typeof data === "boolean") {
     rateLimitAllowed = data;
   }
 } catch {
   console.error("Akiba password recovery rate limit unavailable");
 }
 if (rateLimitAllowed === null) {
   return { status: "error" as const, message: "Password recovery is temporarily unavailable." };
 }
 if (!rateLimitAllowed) {
   return { status: "error" as const, message: "Too many reset requests for this email. Please wait 15 minutes before trying again." };
 }

 // This privileged lookup supports the explicit account feedback requested.
 // The service key remains server-only; inconclusive lookup falls back to
 // privacy-preserving copy rather than guessing.
 try {
   const { data, error: lookupError } = await admin.rpc("akiba_email_exists", { check_email: email });
   if (lookupError) console.error("Akiba password recovery account lookup failed", { code: lookupError.code });
   else if (typeof data === "boolean") accountExists = data;
 } catch {
   console.error("Akiba password recovery account lookup unavailable");
 }

 if (accountExists === false) {
   return { status: "message" as const, message: "No account found for this email address. Check the address or create an Akiba account." };
 }

 const callback = new URL("/auth/callback", site);
 callback.searchParams.set("type", "recovery");
 callback.searchParams.set("flow", "recovery");

 // The browser component sends the email request so @supabase/ssr stores the
 // PKCE verifier in the user's browser cookies before the email link is opened.
 return {
   status: "ready" as const,
   redirectTo: callback.toString(),
   successMessage: accountExists === true
     ? "Password reset link sent. Check your inbox and spam folder."
     : "If an account is registered with this email address, you'll receive instructions to reset your password. Check your inbox and spam folder.",
 };
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
