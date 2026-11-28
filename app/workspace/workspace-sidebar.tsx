"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import { signOut } from "@/app/auth-actions";

type WorkspaceSidebarProps = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  groupCount: number;
  invitationCount: number;
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isActive(pathname: string, href: string) {
  return href === "/workspace"
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

export default function WorkspaceSidebar({
  displayName,
  username,
  avatarUrl,
  groupCount,
  invitationCount,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("akiba-workspace-sidebar-collapsed");
    if (saved === "true" || saved === "false") {
      setCollapsed(saved === "true");
    } else {
      setCollapsed(window.matchMedia("(min-width: 641px) and (max-width: 1024px)").matches);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("akiba-workspace-sidebar-collapsed", String(collapsed));
  }, [collapsed, hydrated]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      triggerRef.current?.focus();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const homeActive = isActive(pathname, "/workspace");
  const groupsActive = isActive(pathname, "/workspace/groups");
  const invitationsActive = isActive(pathname, "/workspace/invitations");
  const notificationsActive = isActive(pathname, "/workspace/notifications");
  const chatActive = isActive(pathname, "/workspace/chat");
  const profileActive = isActive(pathname, "/workspace/profile");
  const settingsActive = isActive(pathname, "/workspace/account-settings");

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="ak-sidebar-mobile-trigger"
        aria-label="Open workspace navigation"
        aria-controls="ak-workspace-sidebar"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <MenuOutlinedIcon />
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="ak-sidebar-backdrop"
          aria-label="Close workspace navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="ak-workspace-sidebar"
        className={"ak-sidebar ak-workspace-sidebar" + (collapsed ? " is-collapsed" : "") + (mobileOpen ? " is-mobile-open" : "")}
        aria-label="Workspace sidebar"
      >
        <div className="ak-sidebar-brand-row">
          <Link href="/workspace" className="ak-brand" aria-label="Akiba workspace home" onClick={() => setMobileOpen(false)}>
            <img src="/akiba-logo.png" alt="" />
            <span>Akiba</span>
          </Link>
          <button
            type="button"
            className="ak-sidebar-collapse-button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRightOutlinedIcon /> : <ChevronLeftOutlinedIcon />}
          </button>
          <button
            type="button"
            ref={closeRef}
            className="ak-sidebar-close-button"
            aria-label="Close workspace navigation"
            onClick={() => setMobileOpen(false)}
          >
            <CloseOutlinedIcon />
          </button>
        </div>

        <nav className="ak-nav ak-workspace-nav" aria-label="Main navigation" onClick={() => setMobileOpen(false)}>
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className={"ak-nav-link" + (homeActive ? " active" : "")} aria-current={homeActive ? "page" : undefined} title={collapsed ? "Home" : undefined}>
            <span className="ak-nav-icon"><HomeOutlinedIcon /></span><span className="ak-nav-text">Home</span>
          </Link>
          <Link href="/workspace/groups" className={"ak-nav-link" + (groupsActive ? " active" : "")} aria-current={groupsActive ? "page" : undefined} title={collapsed ? "My Groups" : undefined}>
            <span className="ak-nav-icon"><GroupsOutlinedIcon /></span><span className="ak-nav-text">My Groups</span>{groupCount > 0 && <small>{groupCount > 99 ? "99+" : groupCount}</small>}
          </Link>
          <Link href="/workspace/invitations" className={"ak-nav-link" + (invitationsActive ? " active" : "")} aria-current={invitationsActive ? "page" : undefined} title={collapsed ? "Invitations" : undefined}>
            <span className="ak-nav-icon"><MailOutlineOutlinedIcon /></span><span className="ak-nav-text">Invitations</span>{invitationCount > 0 && <small>{invitationCount > 99 ? "99+" : invitationCount}</small>}
          </Link>
          <div className="ak-sidebar-dynamic-link" title={collapsed ? "Notifications" : undefined}>
            <NotificationSidebarLink active={notificationsActive} />
          </div>
          <div className="ak-sidebar-dynamic-link" title={collapsed ? "Chat" : undefined}>
            <MessagesSidebarLink active={chatActive} />
          </div>

          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <Link href="/workspace/profile" className={"ak-nav-link" + (profileActive ? " active" : "")} aria-current={profileActive ? "page" : undefined} title={collapsed ? "My Profile" : undefined}>
            <span className="ak-nav-icon"><PersonOutlineOutlinedIcon /></span><span className="ak-nav-text">My Profile</span>
          </Link>
          <Link href="/workspace/account-settings" className={"ak-nav-link" + (settingsActive ? " active" : "")} aria-current={settingsActive ? "page" : undefined} title={collapsed ? "Account Settings" : undefined}>
            <span className="ak-nav-icon"><SettingsOutlinedIcon /></span><span className="ak-nav-text">Account Settings</span>
          </Link>
        </nav>

        <div className="ak-sidebar-bottom">
          <Link href="/workspace/new" className="ak-sidebar-create-link" onClick={() => setMobileOpen(false)} title={collapsed ? "Create a group" : undefined}>
            <span className="ak-sidebar-create-icon">＋</span><span className="ak-sidebar-create-text">Create a group</span>
          </Link>
          <div className="ak-sidebar-user">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{initials(displayName)}</span>}
            <span className="ak-sidebar-user-copy"><strong>{displayName}</strong><small>@{username}</small></span>
            <form action={signOut}>
              <button type="submit" aria-label="Sign out" title="Sign out"><LogoutOutlinedIcon /></button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
