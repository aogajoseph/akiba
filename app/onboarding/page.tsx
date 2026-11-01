import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile, error: profileError }, { data: contact }] = await Promise.all([
    supabase
      .from("akiba_profiles")
      .select("username, display_name, avatar_path, bio")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("akiba_user_contacts")
      .select("phone_number")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    console.error("Akiba onboarding profile lookup failed", { code: profileError.code });
    redirect("/workspace");
  }

  if (profile?.display_name?.trim()) redirect("/workspace");

  const { error } = await searchParams;

  return (
    <main className="profile-setup-shell">
      <header className="profile-setup-topbar">
        <div className="profile-setup-brand-row">
          <Link href="/" className="auth-brand"><img className="auth-brand-logo" src="/akiba-logo.png" alt="" />Akiba</Link>
          <span className="profile-setup-tagline">Do more, together</span>
        </div>
      </header>
      <section className="profile-setup-layout">
        <section className="profile-setup-card" aria-labelledby="profile-setup-title">
          <div className="profile-setup-card-heading">
            <h1 id="profile-setup-title">Set up your profile</h1>
          </div>
          <p className="profile-setup-description">This is how people will know you on Akiba</p>
          {error && <p className="profile-form-error" role="alert">{error}</p>}
          <ProfileForm initial={{
            username: profile?.username ?? "",
            displayName: profile?.display_name ?? "",
            avatarPath: profile?.avatar_path ?? null,
            bio: profile?.bio ?? "",
            phoneNumber: contact?.phone_number ?? "",
          }} />
        </section>
      </section>

    </main>
  );
}
