export function safeInternalPath(value: string | null | undefined, fallback = "/workspace") {
  const candidate = String(value ?? "").trim();
  if (!candidate.startsWith("/")) return fallback;
  try {
    const parsed = new URL(candidate, "https://akiba.invalid");
    return parsed.origin === "https://akiba.invalid" ? candidate : fallback;
  } catch {
    return fallback;
  }
}
