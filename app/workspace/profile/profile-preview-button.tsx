"use client";

import { useEffect, useState } from "react";
import { ProfileContactList } from "./profile-contact-list";

type Props = {
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  emailAddress: string | null;
  emailVisible: boolean;
  phoneNumber: string | null;
  phoneVisible: boolean;
  location: string | null;
  locationVisible: boolean;
};

export function ProfilePreviewButton({ displayName, username, bio, avatarUrl, emailAddress, emailVisible, phoneNumber, phoneVisible, location, locationVisible }: Props) {
  const [open, setOpen] = useState(false);
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" className="ak-profile-preview-trigger" onClick={() => setOpen(true)}>
        <span aria-hidden="true">◉</span> Preview profile
      </button>
      {open && (
        <div className="ak-profile-preview-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="ak-profile-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="ak-profile-preview-title">
            <header className="ak-profile-preview-header">
              <div>
                <span className="ak-profile-preview-eyebrow">HOW OTHERS SEE YOU</span>
                <h2 id="ak-profile-preview-title">Profile preview</h2>
              </div>
              <button type="button" className="ak-profile-preview-close" onClick={() => setOpen(false)} aria-label="Close preview">×</button>
            </header>
            <article className="ak-profile-preview-card">
              {avatarUrl ? <img className="ak-profile-preview-avatar" src={avatarUrl} alt="" /> :
                <span className="ak-profile-preview-avatar ak-profile-preview-fallback">{initial}</span>}
              <h3>{displayName}</h3>
              <p className="ak-profile-preview-username">@{username}</p>
              {bio ? <p className="ak-profile-preview-bio">{bio}</p> :
                <p className="ak-profile-preview-empty-bio">No bio added</p>}
              <div className="ak-profile-preview-divider" />
              <ProfileContactList emailAddress={emailAddress} emailVisible={emailVisible} phoneNumber={phoneNumber} phoneVisible={phoneVisible} location={location} locationVisible={locationVisible} />
            </article>
            <button type="button" className="ak-profile-preview-done" onClick={() => setOpen(false)}>Done</button>
          </section>
        </div>
      )}
    </>
  );
}
