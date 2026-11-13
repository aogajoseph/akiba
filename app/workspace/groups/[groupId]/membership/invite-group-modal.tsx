"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import CopyInvitationLink from "./copy-invitation-link";
import type { GroupInvitationEmailState } from "@/app/workspace/actions";

const initialState: GroupInvitationEmailState = { status: "idle", message: "" };

export default function InviteGroupModal({
  groupId,
  inviteAction,
  shareUrl,
}: {
  groupId: string;
  inviteAction: (
    previousState: GroupInvitationEmailState,
    formData: FormData,
  ) => Promise<GroupInvitationEmailState>;
  shareUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(inviteAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

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
            <span className="ak-section-eyebrow">GROW THE GROUP</span>
            <h2 id="ak-invite-modal-title">Invite someone</h2>
            <form ref={formRef} action={formAction} className="ak-membership-invite-form">
              <input type="hidden" name="group_id" value={groupId} />
              <label htmlFor="ak-invite-recipient-email">Email address
                <input id="ak-invite-recipient-email" name="recipient_email" type="email" placeholder="name@example.com" autoComplete="email" required />
              </label>
              <button type="submit" className="workspace-primary" disabled={pending}>
                {pending ? "Sending Invitation..." : "Send Invitation"}
              </button>
            </form>
            {state.status !== "idle" && (
              <p className={state.status === "success" ? "ak-invite-toast is-success" : "ak-invite-toast is-error"}
                role={state.status === "error" ? "alert" : "status"}>
                {state.message}
              </p>
            )}
            <div className="ak-invite-modal-divider"><span>OR SHARE A GROUP LINK</span></div>
            {shareUrl ? <CopyInvitationLink url={shareUrl} /> : (
              <p role="alert">The group invitation link is temporarily unavailable. Please refresh and try again.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
