"use client";

import { useEffect, useState } from "react";

type AvailabilityResult = {
  username: string;
  available: boolean;
  message: string;
};

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;
const INVALID_USERNAME_MESSAGE =
  "Start with a letter; use 3–20 lowercase letters, numbers or underscores.";

export default function UsernameField() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<AvailabilityResult | null>(null);

  const isValid = USERNAME_PATTERN.test(username);
  const currentResult = result?.username === username ? result : null;
  const available = isValid && currentResult?.available === true;
  const status = !isValid
    ? INVALID_USERNAME_MESSAGE
    : currentResult?.message ?? "Checking availability…";

  useEffect(() => {
    if (!USERNAME_PATTERN.test(username)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          "/api/username-availability?username=" + encodeURIComponent(username),
          { signal: controller.signal },
        );
        const json = await response.json();
        const isAvailable = response.ok && json.available === true;

        setResult({
          username,
          available: isAvailable,
          message: !response.ok
            ? (json.reason || "Could not check availability.")
            : isAvailable
              ? "✓ Username available"
              : "Username already taken",
        });
      } catch {
        if (!controller.signal.aborted) {
          setResult({
            username,
            available: false,
            message: "Could not check availability. Try again.",
          });
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [username]);

  return (
    <label>
      Unique username
      <span style={{ display: "block", fontSize: ".85rem", marginBottom: 6 }}>
        Your Akiba identity: @{username || "username"}
      </span>
      <input
        name="username"
        value={username}
        onChange={(event) =>
          setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
        }
        minLength={3}
        maxLength={20}
        autoComplete="username"
        required
        aria-describedby="username-status"
      />
      <small id="username-status" role="status" aria-live="polite">{status}</small>
      <input
        type="hidden"
        name="availability_checked"
        value={available ? "yes" : "no"}
      />
    </label>
  );
}
