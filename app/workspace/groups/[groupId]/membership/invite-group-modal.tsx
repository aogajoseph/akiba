"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import CopyInvitationLink from "./copy-invitation-link";

type InviteAction = (formData: FormData) => void | Promise<void>;

export default function InviteGroupModal({
  groupId,
  inviteAction,
  successMode,
  shareUrl,
}: {
  groupId: string;
  inviteAction: InviteAction;
  successMode: "email" | "link" | null;
  shareUrl: string | null;
}) {
  const [open, setOpen] = useState(Boolean(successMode));

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
      <button type="button" className="workspace-primary ak-invite-modal-trigger" onClick={() => setOpen(true)}>
        Invite someone
      </button>
      {open && (
        <div className="ak-invite-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="ak-invite-modal" role="dialog" aria-modal="true" aria-labelledby="ak-invite-modal-title">
            <button type="button" className="ak-invite-modal-close" aria-label="Close invitation dialog" onClick={() => setOpen(false)}>×</button>
            {successMode ? (
              <>
                <span className="ak-section-eyebrow">INVITATION CREATED</span>
                <h2 id="ak-invite-modal-title">{successMode === "email" ? "Email invitation ready" : "Shareable link ready"}</h2>
                {successMode === "email" ? (
                  <p>The invitation is addressed to the email you entered. Akiba does not currently send outbound invitation emails, so share the secure link below with the recipient. They must join using the same email address.</p>
                ) : (
                  <p>Your secure invitation link is ready. Share it with the person you want to invite.</p>
                )}
                {shareUrl ? <CopyInvitationLink url={shareUrl} /> : <p role="alert">The invitation was created, but its link could not be prepared. Refresh the page and try again.</p>}
                <button type="button" className="ak-invite-modal-secondary" onClick={() => setOpen(false)}>Done</button>
              </>
            ) : (
              <>
                <span className="ak-section-eyebrow">GROW THE GROUP</span>
                <h2 id="ak-invite-modal-title">Invite someone</h2>
                <p>Choose how you want to invite them.</p>
                <form action={inviteAction} className="ak-membership-invite-form">
                  <input type="hidden" name="group_id" value={groupId} />
                  <input type="hidden" name="invite_mode" value="email" />
                  <label>Email address
                    <input name="recipient_email" type="email" placeholder="name@example.com" autoComplete="email" required />
                  </label>
                  <button type="submit" className="workspace-primary">Create email invitation</button>
                </form>
                <div className="ak-invite-modal-divider"><span>OR</span></div>
                <form action={inviteAction}>
                  <input type="hidden" name="group_id" value={groupId} />
                  <input type="hidden" name="invite_mode" value="link" />
                  <button type="submit" className="ak-invite-modal-secondary">Create and copy invite link</button>
                  <p className="ak-workspace-footnote">The link is single-use and expires after 7 days.</p>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
