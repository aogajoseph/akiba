"use client";
import { useEffect, useState } from "react";
export default function UsernameField() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("Choose a unique username (3–20 characters).");
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    setAvailable(false);
    if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) { setStatus("Start with a letter; use 3–20 lowercase letters, numbers or underscores."); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("Checking availability…");
      try {
        const res = await fetch("/api/username-availability?username=" + encodeURIComponent(username), { signal: controller.signal });
        const json = await res.json();
        setAvailable(res.ok && json.available === true);
        setStatus(!res.ok ? (json.reason || "Could not check availability.") : json.available ? "✓ Username available" : "Username already taken");
      } catch (error) { if (!controller.signal.aborted) setStatus("Could not check availability. Try again."); }
    }, 350);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [username]);
  return <label>Unique username <span style={{display:"block",fontSize:".85rem",marginBottom:6}}>Your Akiba identity: @{username || "username"}</span><input name="username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} minLength={3} maxLength={20} autoComplete="username" required aria-describedby="username-status"/><small id="username-status" role="status" aria-live="polite">{status}</small><input type="hidden" name="availability_checked" value={available ? "yes" : "no"}/></label>;
}
