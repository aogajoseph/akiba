import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileContactList } from "@/app/workspace/profile/profile-contact-list";

type Props = { params: Promise<{ username: string }> };
type PublicProfile = {
  display_name: string;
  username: string;
  avatar_path: string | null;
  bio: string | null;
  email_address: string | null;
  email_visible: boolean;
  phone_number: string | null;
  phone_visible: boolean;
  location: string | null;
  location_visible: boolean;
};

export default async function AkibaPublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.rpc("akiba_get_profile_by_username", {
    p_username: username,
    p_preview: false,
  });
  if (error) {
    console.error("Public profile projection failed", { code: error.code });
    notFound();
  }
  const profile = (Array.isArray(data) ? data[0] : null) as PublicProfile | null;
  if (!profile) notFound();

  const avatarUrl = profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;
  const initial = profile.display_name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <main className="ak-dashboard">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups</Link>
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <Link href="/workspace/profile" className="ak-nav-link"><span>♙</span>My Profile</Link>
          <Link href="/workspace/profile#account" className="ak-nav-link"><span>⚙</span>Settings</Link>
        </nav>
      </aside>
      <section className="ak-main">
        <header className="ak-topbar"><Link href="/workspace" className="ak-settings-back-link">← Back to workspace</Link></header>
        <div className="ak-dashboard-content ak-public-profile-page">
          <div className="ak-welcome">
            <div><div className="ak-eyebrow">AKIBA MEMBER</div><h1>Profile</h1><p>Profile information shared with other Akiba users.</p></div>
          </div>
          <section className="ak-panel ak-public-profile-card">
            <div className="ak-public-profile-identity">
              {avatarUrl ? <img className="ak-public-profile-avatar" src={avatarUrl} alt="" /> : <span className="ak-public-profile-avatar ak-public-profile-fallback">{initial}</span>}
              <div><h2>{profile.display_name}</h2><p>@{profile.username}</p></div>
            </div>
            {profile.bio ? <p className="ak-public-profile-bio">{profile.bio}</p> : null}
            <div className="ak-settings-divider" />
            <div className="ak-panel-heading"><div><h2>Contact information</h2><p>Each detail is shown according to this member&apos;s privacy settings.</p></div></div>
            <ProfileContactList
              emailAddress={profile.email_address} emailVisible={profile.email_visible}
              phoneNumber={profile.phone_number} phoneVisible={profile.phone_visible}
              location={profile.location} locationVisible={profile.location_visible}
            />
          </section>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
