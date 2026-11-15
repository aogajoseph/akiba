"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GroupChat from "./group-chat";

type Member = { initials: string; name: string; role: string; status: string };
const members: Member[] = [
  { initials: "MN", name: "Miriam Njeri", role: "Group admin", status: "Active" },
  { initials: "DK", name: "Daniel Kamau", role: "Member", status: "Active" },
  { initials: "JO", name: "Joseph Otieno", role: "Member", status: "Active" },
  { initials: "AM", name: "Amina Mwangi", role: "Member", status: "Active" },
];
const activity = [
  { time: "Today · 9:32 AM", title: "Daniel Kamau shared an update", detail: "A group message was posted." },
  { time: "Yesterday · 6:10 PM", title: "Amina Mwangi joined the group", detail: "Membership activity · illustrative data" },
  { time: "Oct 18 · 4:45 PM", title: "Group details were updated", detail: "Group activity · illustrative data" },
];

export default function GroupWorkspacePage() {
  const [tab, setTab] = useState<"overview" | "members" | "chat" | "activity">("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitee, setInvitee] = useState("");
  const [notice, setNotice] = useState("");
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const groupName = "Miriam & Daniel";

  function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitee.trim()) return;
    setInviteOpen(false);
    setNotice(`Demo invitation prepared for ${invitee.trim()}. No invitation was sent and no membership changed.`);
    setInvitee("");
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <Link href="/" className="workspace-brand"><span className="workspace-mark">a</span> akiba</Link>
        <nav aria-label="Breadcrumb"><Link href="/">Home</Link><span> / </span><Link href="/#groups">My Groups</Link><span> / </span><b>{groupName}</b></nav>
        <span className="workspace-preview">Prototype · demo data</span>
      </header>
      <div className="workspace-page">
        <div className="workspace-banner"><b>Product preview</b><span>Members, messages, invitations and activity below are illustrative. Nothing is persisted or sent.</span></div>
        {notice && <div className="workspace-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        <Link href="/" className="back-link">← Back to all Groups</Link>
        <section className="group-heading">
          <div className="group-symbol">▦</div>
          <div className="group-title"><div className="workspace-eyebrow">EVENT GROUP</div><h1>{groupName}</h1><p>Wedding celebration · A place for plans, conversations and shared accountability.</p><div className="group-badges"><span>● Active</span><span>4 members</span><span>Created by Miriam</span></div></div>
          <button className="workspace-primary" onClick={() => setInviteOpen(true)}>＋ Invite people</button>
        </section>
        <nav className="group-tabs" aria-label="Group sections">
          {(["overview", "members", "chat", "activity"] as const).map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item === "overview" ? "Overview" : item === "members" ? "Members" : item === "chat" ? "Group chat" : "Activity"}</button>)}
        </nav>
        {tab === "overview" && <div className="workspace-columns">
          <section className="workspace-panel"><div className="workspace-panel-head"><div><div className="workspace-eyebrow">AT A GLANCE</div><h2>Group overview</h2></div><span className="workspace-pill">Event</span></div><p className="workspace-muted">This group brings people together around a shared event. Important decisions and updates should stay visible to members with access.</p><div className="overview-stats"><div><span>Members</span><b>4</b></div><div><span>Recorded contributions</span><b>KES 84,500</b></div><div><span>Shared progress</span><b>68%</b></div></div><div className="workspace-panel-head subhead"><h3>Recent group activity</h3><button onClick={() => setTab("activity")}>View all →</button></div>{activity.slice(0, 2).map((item) => <div className="timeline-item" key={item.title}><span className="timeline-dot" /><div><b>{item.title}</b><p>{item.detail}</p><small>{item.time}</small></div></div>)}</section>
          <aside className="workspace-panel"><div className="workspace-eyebrow">PEOPLE</div><div className="workspace-panel-head"><h2>Group members</h2><button onClick={() => setTab("members")}>View all →</button></div>{members.slice(0, 3).map((member) => <div className="member-row" key={member.name}><span className="member-avatar">{member.initials}</span><div><b>{member.name}</b><small>{member.role}</small></div>{member.role === "Group admin" && <span className="admin-tag">Admin</span>}</div>)}<button className="workspace-secondary full-width" onClick={() => setInviteOpen(true)}>＋ Invite a member</button><div className="privacy-note"><b>Membership matters</b><p>Group information should only be available to authorized current members. Leaving a group must revoke access without erasing legitimate history.</p></div></aside>
        </div>}
        {tab === "members" && <section className="workspace-panel"><div className="workspace-panel-head"><div><div className="workspace-eyebrow">ACCESS & PARTICIPATION</div><h2>Group members</h2></div><button className="workspace-primary" onClick={() => setInviteOpen(true)}>＋ Invite people</button></div><p className="workspace-muted">Roles and membership changes require server-side authorization in the connected product. This preview does not change real access.</p>{members.map((member) => <div className="member-row member-row-wide" key={member.name}><span className="member-avatar">{member.initials}</span><div><b>{member.name}</b><small>{member.status}</small></div><span className={member.role === "Group admin" ? "role-tag admin-tag" : "role-tag"}>{member.role}</span><button className="workspace-secondary" onClick={() => setNotice("Role and membership actions are not enabled in this prototype.")}>Manage</button></div>)}</section>}
        {tab === "chat" && <GroupChat groupId={groupId} />}
        {tab === "activity" && <section className="workspace-panel"><div className="workspace-eyebrow">GROUP HISTORY</div><h2>Activity timeline</h2><p className="workspace-muted">A durable history of important group events is distinct from financial ledger entries and security audit records.</p>{activity.map((item) => <div className="timeline-item" key={item.title}><span className="timeline-dot" /><div><b>{item.title}</b><p>{item.detail}</p><small>{item.time}</small></div></div>)}</section>}
      </div>
      {inviteOpen && <div className="workspace-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}><section className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="invite-title"><div className="workspace-panel-head"><div><div className="workspace-eyebrow">GROW YOUR GROUP</div><h2 id="invite-title">Invite someone</h2></div><button className="workspace-close" onClick={() => setInviteOpen(false)} aria-label="Close">×</button></div><p className="workspace-muted">The live invitation flow will use expiring, unpredictable invitation tokens and server-side checks. This form is a visual prototype only.</p><form onSubmit={inviteMember}><label htmlFor="invitee">Email or phone number</label><input id="invitee" value={invitee} onChange={(event) => setInvitee(event.target.value)} placeholder="name@example.com or phone" required maxLength={160}/><button className="workspace-primary full-width" type="submit">Prepare demo invitation</button></form></section></div>}
    </main>
  );
}
