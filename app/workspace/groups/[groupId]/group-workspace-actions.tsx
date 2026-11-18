"use client";

import { useState } from "react";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

export default function GroupWorkspaceActions({
  groupName,
  isCreator,
  invitationUrl,
}: {
  groupName: string;
  isCreator: boolean;
  invitationUrl: string | null;
}) {
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function copyInvitationLink() {
    if (!invitationUrl) {
      setMessage("A group invitation link is not available right now.");
      return;
    }
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setMessage("Group invitation link copied. Share it on any platform.");
      setMenuOpen(false);
    } catch {
      setMessage("Couldn't copy the invitation link. Please try again.");
    }
  }

  async function shareGroup() {
    if (!invitationUrl) {
      setMessage("A group invitation link is not available right now.");
      return;
    }
    const title = groupName + " · Akiba";
    const text = "Request to join " + groupName + " on Akiba. The Group Creator will review your request.";
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: invitationUrl });
      } else {
        await copyInvitationLink();
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setMessage("Couldn't share the invitation link. Please try again.");
      }
    }
  }

  return (
    <div className="ak-workspace-action-wrap">
      <button type="button" className="ak-workspace-share" onClick={shareGroup}>
        <ShareOutlinedIcon fontSize="small" /> <span>Share Group</span>
      </button>
      <div className="ak-workspace-more-wrap">
        <button type="button" className="ak-workspace-more" aria-expanded={menuOpen} aria-haspopup="menu" aria-label="More group actions" onClick={() => setMenuOpen((open) => !open)}>
          <MoreHorizIcon fontSize="small" />
        </button>
      </div>
      {menuOpen && (
        <div className="ak-workspace-more-menu" role="menu">
          <button type="button" role="menuitem" onClick={copyInvitationLink}>Copy group link</button>
          <button type="button" role="menuitem" disabled={!isCreator} onClick={() => { window.location.href = window.location.pathname + "/settings"; setMenuOpen(false); }}>Edit group</button>
        </div>
      )}
      {message && <div className="ak-workspace-action-message" role="status">{message}<button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>×</button></div>}
    </div>
  );
}
