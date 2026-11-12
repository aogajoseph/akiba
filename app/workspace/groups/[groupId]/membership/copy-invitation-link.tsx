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

  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "Akiba group invitation", text: "You're invited to join a group on Akiba.", url });
      setError("");
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name !== "AbortError") {
        setError("Couldn't open the share menu. You can copy the link instead.");
      }
    }
  }

  return (
    <div className="ak-membership-copy">
      <input aria-label="Invitation link" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
      <button type="button" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
      <button type="button" className="ak-membership-share-button" onClick={share}>Share</button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
