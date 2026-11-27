"use client";

import { useState, useTransition } from "react";
import { saveThemePreference, type AkibaTheme } from "./actions";

export default function ThemePreference({ initialTheme }: { initialTheme: AkibaTheme }) {
  const [theme, setTheme] = useState<AkibaTheme>(initialTheme);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function chooseTheme(nextTheme: AkibaTheme) {
    const previous = theme;
    setTheme(nextTheme);
    setMessage("");
    document.documentElement.dataset.akibaTheme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme === "system" ? "" : nextTheme;
    startTransition(async () => {
      const result = await saveThemePreference(nextTheme);
      if (!result.success) {
        setTheme(previous);
        document.documentElement.dataset.akibaTheme = previous;
        document.documentElement.style.colorScheme = previous === "system" ? "" : previous;
        setMessage(result.message);
      } else {
        setMessage("Appearance preference saved.");
      }
    });
  }

  return (
    <div className="ak-account-theme-control">
      <label className="ak-settings-field">
        <span>Theme</span>
        <select value={theme} disabled={isPending} onChange={(event) => chooseTheme(event.currentTarget.value as AkibaTheme)}>
          <option value="light">Light theme</option>
          <option value="dark">Dark theme</option>
          <option value="system">System default</option>
        </select>
        <small>Your preference is saved to your Akiba account and follows you across devices.</small>
      </label>
      {message && <p className={message.includes("saved") ? "ak-settings-success" : "ak-settings-inline-note"} role="status">{message}</p>}
    </div>
  );
}
