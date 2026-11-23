"use client";

import { useState } from "react";

type Props = {
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
};

export function ProfilePreviewButton({ displayName, username, bio, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "?";

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
              <div className="ak-profile-preview-private">
                <span aria-hidden="true">▣</span>
                <div><strong>Contact details are private</strong><small>Email, phone number and location are not shown to other users in the current release.</small></div>
                <span className="ak-profile-preview-lock" aria-label="Private">Private</span>
              </div>
            </article>
            <p className="ak-profile-preview-note">This preview shows your saved profile identity. Contact-sharing preferences are saved for a future release; they do not currently make contact details visible to other members.</p>
            <button type="button" className="ak-profile-preview-done" onClick={() => setOpen(false)}>Done</button>
          </section>
        </div>
      )}
    </>
  );
}
