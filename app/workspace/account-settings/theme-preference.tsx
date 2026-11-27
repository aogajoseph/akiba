"use client";

import { useState } from "react";
import { saveThemePreference, type AkibaTheme } from "./actions";

export default function ThemePreference({ initialTheme }: { initialTheme: AkibaTheme }) {
  const [theme, setTheme] = useState<AkibaTheme>(initialTheme);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  function chooseTheme(nextTheme: AkibaTheme) {
    const previous = theme;
    setTheme(nextTheme);
    setMessage("");
    document.documentElement.dataset.akibaTheme = nextTheme === "dark" ? "dark" : "light";
    document.documentElement.style.colorScheme = nextTheme === "dark" ? "dark" : "light";
    setIsPending(true);
    void saveThemePreference(nextTheme).then((result) => {
      if (!result.success) {
        setTheme(previous);
        document.documentElement.dataset.akibaTheme = previous === "dark" ? "dark" : "light";
        document.documentElement.style.colorScheme = previous === "dark" ? "dark" : "light";
        setMessage(result.message);
      } else {
        setMessage("Appearance preference saved.");
      }
      }).finally(() => setIsPending(false));
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
