import Link from "next/link";
import PasswordResetRequestForm from "./password-reset-request-form";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
 const params = await searchParams;
 return <main className="auth-shell"><section className="auth-card">
   <Link href="/" className="auth-brand">Akiba</Link>
   <h1>Reset your password</h1>
   <p className="auth-description">Enter the email address associated with your Akiba account to request a reset link.</p>
   <PasswordResetRequestForm initialError={params.error} initialMessage={params.message} />
   <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
 </section></main>;
}
