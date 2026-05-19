export function normalizeEmail(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!s || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

export function normalizeFullName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 200) : "";
}
