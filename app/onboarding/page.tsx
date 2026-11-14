import Link from "next/link";
import { safeInternalPath } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/workspace");
  const invitationOnboarding = /^\/invitations\/[0-9a-f]{64}\?complete=1&kind=(email|link)$/.test(next);

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

  if (profile?.display_name?.trim()) redirect(next);

  const { error } = params;

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
          <p className="profile-setup-description">{invitationOnboarding
            ? "Finish setting up your profile. We’ll add you to the group you were invited to and take you straight there."
            : "This is how people will know you on Akiba"}</p>
          {error && <p className="profile-form-error" role="alert">{error}</p>}
          <ProfileForm next={next} initial={{
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
