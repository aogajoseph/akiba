"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

export default function GroupWorkspaceActions({
  groupName,
  invitationUrl,
}: {
  groupName: string;
  invitationUrl: string | null;
}) {
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function updateMenuPosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuPosition({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
    }
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function copyInvitationLink() {
    if (!invitationUrl) {
      setMessage("A group invitation link is not available right now.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitationUrl);
      } else {
        const field = document.createElement("textarea");
        field.value = invitationUrl;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
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
        <button ref={triggerRef} type="button" className="ak-workspace-more" aria-expanded={menuOpen} aria-haspopup="menu" aria-label="More group actions" onClick={() => setMenuOpen((open) => !open)}>
          <MoreHorizIcon fontSize="small" />
        </button>
      </div>
      {menuOpen && menuPosition && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="ak-workspace-more-menu" style={menuPosition} role="menu">
          <button type="button" role="menuitem" onClick={copyInvitationLink}>Copy Group link</button>
        </div>,
        document.body
      )}
      {message && <div className="ak-workspace-action-message" role="status">{message}<button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>×</button></div>}
    </div>
  );
}
