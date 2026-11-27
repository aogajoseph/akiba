"use client";

import { useState } from "react";
import { saveThemePreference, type AkibaTheme } from "./actions";

function applyTheme(theme: AkibaTheme) {
  // Akiba's "system" setting intentionally resolves to the light palette.
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.akibaTheme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export default function ThemePreference({ initialTheme }: { initialTheme: AkibaTheme }) {
  const [theme, setTheme] = useState<AkibaTheme>(initialTheme);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function chooseTheme(nextTheme: AkibaTheme) {
    if (isPending || nextTheme === theme) return;
    const previous = theme;
    setTheme(nextTheme);
    setMessage("");
    applyTheme(nextTheme);
    setIsPending(true);

    try {
      const result = await saveThemePreference(nextTheme);
      if (!result.success) {
        setTheme(previous);
        applyTheme(previous);
        setMessage(result.message);
      } else {
        setMessage("Appearance preference saved.");
      }
    } catch {
      // A failed server action must not leave the UI showing an unsaved choice.
      setTheme(previous);
      applyTheme(previous);
      setMessage("We couldn’t save your appearance preference. Check your connection and try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="ak-account-theme-control">
      <label className="ak-settings-field">
        <span>Theme</span>
        <select value={theme} disabled={isPending} onChange={(event) => void chooseTheme(event.currentTarget.value as AkibaTheme)}>
          <option value="light">Light theme</option>
          <option value="dark">Dark theme</option>
          <option value="system">System default (Light)</option>
        </select>
        <small>System default uses Akiba’s light appearance. Your preference is saved to your account and used across devices.</small>
      </label>
      {message && <p className={message.includes("saved") ? "ak-settings-success" : "ak-settings-inline-note"} role="status">{message}</p>}
    </div>
  );
}
