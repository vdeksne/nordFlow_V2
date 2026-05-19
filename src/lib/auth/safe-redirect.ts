/** Prevent open redirects after login (only same-origin paths). */
export function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== "string") return "/dashboard";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard";
  return t;
}
