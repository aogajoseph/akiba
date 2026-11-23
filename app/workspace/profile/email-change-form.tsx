"use client";

import { useActionState, useState } from "react";
import { updateAuthEmail } from "./actions";
import { ProfileSubmitButton } from "./profile-submit-button";

type EmailChangeState = {
  status: "idle" | "error" | "success";
  message: string;
  email: string;
};

const initialState: EmailChangeState = { status: "idle", message: "", email: "" };

export function EmailChangeForm() {
  const [state, action] = useActionState(updateAuthEmail, initialState);
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="ak-group-settings-form">
      <div className="ak-settings-fields">
        <label className="ak-settings-field">
          <span>New sign-in email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="new@email.com"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            maxLength={320}
            required
          />
          <small>Your current sign-in email will remain active until the new address is verified.</small>
        </label>
      </div>
      {state.message && (
        <p className={state.status === "success" ? "ak-settings-success" : "ak-settings-inline-note"}
          role={state.status === "success" ? "status" : "alert"} aria-live="polite">
          {state.message}
          {state.email && <span className="ak-email-change-address"> Address entered: <strong>{state.email}</strong></span>}
        </p>
      )}
      <div className="ak-settings-save-row">
        <p>We send a verification link. Your sign-in address changes only after confirmation.</p>
        <ProfileSubmitButton idle="Request email change" pending="Requesting email change..." />
      </div>
    </form>
  );
}
