import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changePassword, saveUserProfile, signOutOtherSessions } from "./actions";
import { ProfileSubmitButton } from "./profile-submit-button";
import { ProfileImagePicker } from "./profile-image-picker";
import { EmailChangeForm } from "./email-change-form";
import { ProfilePreviewButton } from "./profile-preview-button";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function UserProfilePage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const [{ data: profile, error: profileError }, { data: contact, error: contactError }, { data: privacy, error: privacyError }] = await Promise.all([
    supabase.from("akiba_profiles").select("username,display_name,avatar_path,bio").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_user_contacts").select("phone_number,location").eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_user_privacy_settings").select("email_visibility,phone_visibility,location_visibility").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profileError || !profile) redirect("/onboarding");
  const displayName = profile.display_name?.trim() || profile.username || "Akiba member";
  const username = profile.username ?? "";
  const privateSettingsUnavailable = Boolean(contactError || privacyError);
  // Build the preview from the same fresh profile/contact/privacy rows used by this page.
  // Avoid the preview RPC here so newly saved private contact settings are reflected immediately.
  const preview = {
    email_address: user.email ?? null,
    email_visible: privacy?.email_visibility === "group_members" || privacy?.email_visibility === "all_akiba_users",
    phone_number: contact?.phone_number ?? null,
    phone_visible: privacy?.phone_visibility === "group_members" || privacy?.phone_visibility === "all_akiba_users",
    location: contact?.location ?? null,
    location_visible: privacy?.location_visibility === "group_members" || privacy?.location_visibility === "all_akiba_users",
  };
  const params = await searchParams;
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const defaults = { email: privacy?.email_visibility ?? "only_me", phone: privacy?.phone_visibility ?? "only_me", location: privacy?.location_visibility ?? "only_me" };
  const select = (name: string, value: string) => <label className="ak-settings-field"><span>{name} visibility</span><select name={name.toLowerCase() + "_visibility"} defaultValue={value}><option value="only_me">Only me</option><option value="group_members">Group participants</option><option value="all_akiba_users">All Akiba users</option></select></label>;
  return (
    <main className="ak-dashboard">
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span><Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link><Link href="/workspace/groups" className="ak-nav-link"><span>♧</span>My Groups</Link>
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span><Link href="/workspace/profile" className="ak-nav-link active"><span>♙</span>Edit Profile</Link><Link href="/workspace/profile#account" className="ak-nav-link"><span>⚙</span>Settings</Link>
        </nav>
        <div className="ak-sidebar-bottom"><div className="ak-sidebar-user">{avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{displayName.slice(0,1).toUpperCase()}</span>}<span className="ak-sidebar-user-copy"><strong>{displayName}</strong><small>@{profile.username}</small></span></div></div>
      </aside>
      <section className="ak-main">
        <header className="ak-topbar"><Link href="/workspace" className="ak-settings-back-link">← Back to workspace</Link><div className="ak-topbar-right">{avatarUrl ? <img className="ak-topbar-avatar" src={avatarUrl} alt="" /> : <span className="ak-topbar-avatar">{profile.display_name.slice(0,1).toUpperCase()}</span>}</div></header>
        <div className="ak-dashboard-content">
          <div className="ak-welcome"><div><div className="ak-eyebrow">ACCOUNT</div><h1>My Profile</h1><p>Manage your identity and the personal information you share on Akiba.</p></div><ProfilePreviewButton displayName={displayName} username={username} bio={profile.bio} avatarUrl={avatarUrl}
            emailAddress={preview?.email_address ?? null} emailVisible={Boolean(preview?.email_visible)}
            phoneNumber={preview?.phone_number ?? null} phoneVisible={Boolean(preview?.phone_visible)}
            location={preview?.location ?? null} locationVisible={Boolean(preview?.location_visible)} /></div>
          {params.error && <p className="ak-settings-inline-note" role="alert">{params.error}</p>}
          {params.success && <p className="ak-settings-success" role="status">{params.success}</p>}
          <section className="ak-panel ak-settings-section">
            <div className="ak-panel-heading"><div><h2>Identity information</h2><p>Your identity appears consistently across Akiba.</p></div></div>
            <form action={saveUserProfile} className="ak-group-settings-form" encType="multipart/form-data">
              <ProfileImagePicker currentImage={avatarUrl} fallback={profile.display_name.slice(0,1).toUpperCase()} />{avatarUrl && <label className="ak-settings-remove-avatar"><input type="checkbox" name="remove_avatar" value="yes" /> Remove current photo</label>}
              <div className="ak-settings-fields">
                <label className="ak-settings-field"><span>Display name <em>Required</em></span><input name="display_name" defaultValue={profile.display_name ?? ""} maxLength={60} required /></label>
                <label className="ak-settings-field"><span>@Username <em>Required</em></span><input name="username" defaultValue={profile.username ?? ""} minLength={3} maxLength={20} pattern="[a-z][a-z0-9_]{2,19}" required /><small>3–20 characters; start with a letter.</small></label>
                <label className="ak-settings-field ak-settings-custom-value"><span>Bio <small>Optional · 160 characters</small></span><textarea name="bio" defaultValue={profile.bio ?? ""} maxLength={160} rows={3} /></label>
              </div>
              <div className="ak-settings-save-row"><p>Display name and username are required. Photo and bio are optional.</p><ProfileSubmitButton idle="Save profile" pending="Saving profile..." /></div>
            </form>
          </section>
          <section className="ak-panel ak-settings-section">
            <div className="ak-panel-heading"><div><h2>Contact &amp; privacy</h2><p>Keep your contact details up to date and choose who can see each detail on your Akiba profile.</p></div></div>
            {privateSettingsUnavailable ? <p className="ak-settings-inline-note" role="alert">Your private contact settings could not be loaded. Refresh the page to try again. No changes have been made.</p> : <form action={saveUserProfile} className="ak-group-settings-form">
              <div className="ak-settings-fields">
                <label className="ak-settings-field"><span>Email address <em>Required · Sign-in</em></span><input value={user.email ?? ""} readOnly /><small>Change your sign-in email in Account settings below.</small></label>
                <label className="ak-settings-field"><span>Phone number <small>Optional</small></span><input name="phone_number" type="tel" defaultValue={contact?.phone_number ?? ""} placeholder="+2547XXXXXXXX" /></label>
                <label className="ak-settings-field"><span>General location <small>Optional · City or region only</small></span><input name="location" defaultValue={contact?.location ?? ""} maxLength={120} placeholder="e.g. Nairobi, Kenya" /></label>
              </div>
              <div className="ak-settings-fields">{select("Phone", defaults.phone)}{select("Location", defaults.location)}{select("Email", defaults.email)}</div>
              <div className="ak-settings-save-row"><p>Only you can edit these details. Other users see each field only when its visibility setting allows it.</p><ProfileSubmitButton idle="Save contact & privacy" pending="Saving contact details..." /></div>
            </form>}
          </section>
          <section className="ak-panel ak-settings-section" id="account">
            <div className="ak-panel-heading"><div><h2>Account</h2><p>Your sign-in email is managed by Supabase Authentication.</p></div></div>
            <EmailChangeForm />
            <div className="ak-settings-divider" />
            <div className="ak-panel-heading"><div><h2>Password</h2><p>Choose a strong password you do not use elsewhere.</p></div></div>
            <form action={changePassword} className="ak-group-settings-form">
              <div className="ak-settings-fields">
                <label className="ak-settings-field"><span>New password</span><input name="new_password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /><small>Use at least 10 characters.</small></label>
                <label className="ak-settings-field"><span>Confirm new password</span><input name="confirm_password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></label>
              </div>
              <div className="ak-settings-save-row"><p>Your password is updated through Akiba Authentication.</p><ProfileSubmitButton idle="Update password" pending="Updating password..." /></div>
            </form>
            <div className="ak-settings-divider" />
            <div className="ak-panel-heading"><div><h2>Active sessions</h2><p>Sign out of other devices while keeping this session open.</p></div></div>
            <form action={signOutOtherSessions} className="ak-group-settings-form">
              <div className="ak-settings-save-row"><p>Other sessions may remain active until their current access tokens expire or they attempt to refresh.</p><ProfileSubmitButton className="ak-settings-secondary-button ak-settings-signout-button" idle="Sign out other sessions" pending="Signing out other sessions..." /></div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
