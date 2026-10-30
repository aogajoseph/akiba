import Link from "next/link";
import { requestPasswordReset } from "@/app/auth-actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
 const params = await searchParams;
 return <main className="auth-shell"><section className="auth-card">
   <Link href="/" className="auth-brand">Akiba</Link>
   <h1>Reset your password</h1>
   <p className="auth-description">Enter your account email to request a reset link.</p>
   {params.error && <p className="auth-error" role="alert">{params.error}</p>}
   {params.message && <p className="auth-message" role="status">{params.message}</p>}
   <form action={requestPasswordReset} className="auth-form">
     <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
     <button type="submit">Send reset link</button>
   </form>
   <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
 </section></main>;
}