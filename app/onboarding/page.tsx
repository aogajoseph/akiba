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
        <Link href="/" className="profile-setup-brand"><span className="workspace-mark">a</span> akiba</Link>
        <span>PROFILE SETUP <i aria-hidden="true">1 / 1</i></span>
      </header>
      <section className="profile-setup-layout">
        <div className="profile-setup-intro">
          <div className="profile-setup-eyebrow"><span /> YOUR SPACE, YOUR IDENTITY</div>
          <h1>Let people know<br />it’s <em>you.</em></h1>
          <p>Set up your Akiba profile so friends and group members can recognise you. You can change these details later.</p>
          <div className="profile-setup-promise">
            <span aria-hidden="true">✳</span>
            <div><strong>Simple by design</strong><small>Just the essentials to get started. No location or preferences needed right now.</small></div>
          </div>
        </div>
        <section className="profile-setup-card" aria-labelledby="profile-setup-title">
          <div className="profile-setup-card-heading">
            <div><div className="profile-setup-eyebrow">A FEW DETAILS</div><h2 id="profile-setup-title">Your profile</h2></div>
            <span className="profile-setup-step">Almost there</span>
          </div>
          <p className="profile-setup-description">Required fields are marked. Everything else can wait.</p>
          {error && <p className="profile-form-error" role="alert">{error}</p>}
          <ProfileForm initial={{
            username: profile?.username ?? "",
            displayName: profile?.display_name ?? "",
            avatarPath: profile?.avatar_path ?? null,
            bio: profile?.bio ?? "",
            phoneNumber: contact?.phone_number ?? "",
          }} />
          <p className="profile-setup-privacy"><span aria-hidden="true">⌑</span> Your phone number stays private. English is your default language for now.</p>
        </section>
      </section>
      <footer className="profile-setup-footer"><span>Akiba · A Globe Software product</span><span>Made for doing more, together.</span></footer>
    </main>
  );
}
