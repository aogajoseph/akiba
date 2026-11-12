"use client";

import { useState } from "react";

export default function CopyInvitationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError("");
    } catch {
      setError("Couldn't copy the link. Select and copy it below.");
    }
  }

  return (
    <div className="ak-membership-copy">
      <input aria-label="Invitation link" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
      <button type="button" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
