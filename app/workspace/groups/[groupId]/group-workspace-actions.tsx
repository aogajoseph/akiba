"use client";

import { useState } from "react";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

export default function GroupWorkspaceActions({ groupName, isAdmin }: { groupName: string; isAdmin: boolean }) {
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function shareGroup() {
    const url = window.location.href;
    const title = groupName + " · Akiba";
    const text = "You're viewing " + groupName + " on Akiba. Only active group members can access this page.";
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Group link copied. Only active members can access it.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setMessage("Couldn't share the link. Please try again.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Group link copied. Only active members can access it.");
      setMenuOpen(false);
    } catch {
      setMessage("Couldn't copy the link. Please try again.");
    }
  }

  return (
    <div className="ak-workspace-action-wrap">
      <button type="button" className="ak-workspace-share" onClick={shareGroup}><ShareOutlinedIcon fontSize="small" /> <span>Share Group</span></button>
      <div className="ak-workspace-more-wrap">
        <button type="button" className="ak-workspace-more" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((open) => !open)}><MoreHorizIcon fontSize="small" /> <span className="sr-only">More group actions</span></button>
        {menuOpen && <div className="ak-workspace-more-menu" role="menu">
          <button type="button" role="menuitem" onClick={copyLink}>Copy group link</button>
          <button type="button" role="menuitem" disabled aria-disabled="true">Report group <span className="ak-menu-item-note">Soon</span></button>
          <button type="button" role="menuitem" disabled aria-disabled="true">Leave group <span className="ak-menu-item-note">Soon</span></button>
          {isAdmin && <button type="button" role="menuitem" disabled aria-disabled="true">Edit group <span className="ak-menu-item-note">Soon</span></button>}
          {isAdmin && <button type="button" role="menuitem" className="ak-menu-item-danger" disabled aria-disabled="true">Delete group <span className="ak-menu-item-note">Soon</span></button>}
          <div className="ak-menu-divider" />
          <button type="button" role="menuitem" disabled aria-disabled="true">Notification settings <span className="ak-menu-item-note">Soon</span></button>
        </div>}
      </div>
      {message && <div className="ak-workspace-action-message" role="status">{message}<button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>×</button></div>}
    </div>
  );
}
