import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
export async function GET(request: NextRequest) {
 const code=request.nextUrl.searchParams.get("code");
 const tokenHash=request.nextUrl.searchParams.get("token_hash");
 const type=request.nextUrl.searchParams.get("type");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const origin=process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
 if(!url||!key) return NextResponse.redirect(new URL("/login?error=Authentication%20is%20not%20configured",origin));
 const store=await cookies();
 const supabase=createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll:items=>items.forEach(({name,value,options})=>store.set(name,value,options))}});
 if(code){const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL("/onboarding",origin));console.error("Akiba code exchange failed",{code:error.code,message:error.message});}
 else if(tokenHash && type==="signup"){const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type:"signup"});if(!error)return NextResponse.redirect(new URL("/onboarding",origin));console.error("Akiba email verification failed",{code:error.code,message:error.message});}
 return NextResponse.redirect(new URL("/login?error="+encodeURIComponent("Email confirmation could not be completed. The link may be expired or already used."),origin));
}
