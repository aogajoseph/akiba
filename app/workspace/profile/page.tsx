import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveUserProfile, updateAuthEmail } from "./actions";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function UserProfilePage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const [{ data: profile, error: profileError }, { data: contact }, { data: privacy }] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path,bio").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_user_contacts").select("phone_number,location").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_user_privacy_settings").select("email_visibility,phone_visibility,location_visibility").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profileError || !profile) redirect("/onboarding");
  const params = await searchParams;
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const defaults = { email: privacy?.email_visibility ?? "only_me", phone: privacy?.phone_visibility ?? "only_me", location: privacy?.location_visibility ?? "only_me" };
  const select = (name: string, value: string) => <label className="ak-settings-field"><span>{name} visibility</span><select name={name.toLowerCase() + "_visibility"} defaultValue={value}><option value="only_me">Only me</option><option value="group_members">My Group members</option><option value="all_akiba_users">All Akiba users</option></select></label>;
  return (
    <main className="ak-dashboard">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span><Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link><Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups</Link>
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span><Link href="/workspace/profile" className="ak-nav-link active"><span>♙</span>My Profile</Link><Link href="/workspace/profile#account" className="ak-nav-link"><span>⚙</span>Settings</Link>
        </nav>
        <div className="ak-sidebar-bottom"><div className="ak-sidebar-user">{avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{profile.display_name.slice(0,1).toUpperCase()}</span>}<span className="ak-sidebar-user-copy"><strong>{profile.display_name}</strong><small>@{profile.username}</small></span></div></div>
      </aside>
      <section className="ak-main">
        <header className="ak-topbar"><Link href="/workspace" className="ak-settings-back-link">← Back to workspace</Link><div className="ak-topbar-right">{avatarUrl ? <img className="ak-topbar-avatar" src={avatarUrl} alt="" /> : <span className="ak-topbar-avatar">{profile.display_name.slice(0,1).toUpperCase()}</span>}</div></header>
        <div className="ak-dashboard-content">
          <div className="ak-welcome"><div><div className="ak-eyebrow">ACCOUNT</div><h1>My Profile</h1><p>Manage your identity and the personal information you share on Akiba.</p></div></div>
          {params.error && <p className="ak-settings-inline-note" role="alert">{params.error}</p>}
          {params.success && <p className="ak-settings-success" role="status">{params.success}</p>}
          <section className="ak-panel ak-settings-section">
            <div className="ak-panel-heading"><div><h2>Identity information</h2><p>Your identity appears consistently across Akiba.</p></div></div>
            <form action={saveUserProfile} className="ak-group-settings-form" encType="multipart/form-data">
              <div className="ak-settings-image-preview">{avatarUrl ? <img src={avatarUrl} alt="Current profile photo" /> : <span className="ak-settings-page-image">{profile.display_name.slice(0,1).toUpperCase()}</span>}<div className="ak-settings-field"><span>Profile photo <small>Optional · JPG, PNG or WebP · 3 MB max</small></span><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" />{avatarUrl && <label><input type="checkbox" name="remove_avatar" value="yes" /> Remove current photo</label>}</div></div>
              <div className="ak-settings-fields">
                <label className="ak-settings-field"><span>Display name <em>Required</em></span><input name="display_name" defaultValue={profile.display_name ?? ""} maxLength={60} required /></label>
                <label className="ak-settings-field"><span>@Username <em>Required</em></span><input name="username" defaultValue={profile.username ?? ""} minLength={3} maxLength={20} pattern="[a-z][a-z0-9_]{2,19}" required /><small>3–20 characters; start with a letter.</small></label>
                <label className="ak-settings-field ak-settings-custom-value"><span>Bio <small>Optional · 160 characters</small></span><textarea name="bio" defaultValue={profile.bio ?? ""} maxLength={160} rows={3} /></label>
              </div>
              <div className="ak-settings-save-row"><p>Display name and username are required. Photo and bio are optional.</p><button className="workspace-primary" type="submit">Save profile</button></div>
            </form>
          </section>
          <section className="ak-panel ak-settings-section">
            <div className="ak-panel-heading"><div><h2>Personal information</h2><p>Private by default. You control each field independently.</p></div></div>
            <form action={saveUserProfile} className="ak-group-settings-form">
              <div className="ak-settings-fields">
                <label className="ak-settings-field"><span>Email address <em>Required · Sign-in</em></span><input value={user.email ?? ""} readOnly /><small>Change your sign-in email in Account settings below.</small></label>
                <label className="ak-settings-field"><span>Phone number <small>Optional</small></span><input name="phone_number" type="tel" defaultValue={contact?.phone_number ?? ""} placeholder="+2547XXXXXXXX" /></label>
                <label className="ak-settings-field"><span>General location <small>Optional · City or region only</small></span><input name="location" defaultValue={contact?.location ?? ""} maxLength={120} placeholder="e.g. Nairobi, Kenya" /></label>
              </div>
              <div className="ak-settings-fields">{select("Phone", defaults.phone)}{select("Location", defaults.location)}{select("Email", defaults.email)}</div>
              <div className="ak-settings-save-row"><p>Visibility applies to authenticated Akiba users only, never the public internet.</p><button className="workspace-primary" type="submit">Save personal information</button></div>
            </form>
          </section>
          <section className="ak-panel ak-settings-section" id="account">
            <div className="ak-panel-heading"><div><h2>Account</h2><p>Your sign-in email is managed by Supabase Authentication.</p></div></div>
            <form action={updateAuthEmail} className="ak-group-settings-form">
              <div className="ak-settings-fields"><label className="ak-settings-field"><span>New sign-in email</span><input name="email" type="email" autoComplete="email" placeholder="new@email.com" required /></label></div>
              <div className="ak-settings-save-row"><p>We send a verification link. Your sign-in address changes only after confirmation.</p><button className="workspace-primary" type="submit">Request email change</button></div>
            </form>
            <p className="ak-settings-inline-note">Password, active sessions and account deletion are outside this profile MVP and will be handled in the dedicated Account Settings scope.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
