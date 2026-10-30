import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePassword } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/forgot-password?error=" + encodeURIComponent("Your reset link is invalid or expired. Request another."));
 const params = await searchParams;
 return <main className="auth-shell"><section className="auth-card">
   <Link href="/" className="auth-brand">Akiba</Link>
   <h1>Choose a new password</h1>
   <p className="auth-description">Use at least 8 characters.</p>
   {params.error && <p className="auth-error" role="alert">{params.error}</p>}
   <form action={updatePassword} className="auth-form">
     <label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
     <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
     <button type="submit">Update password</button>
   </form>
 </section></main>;
}