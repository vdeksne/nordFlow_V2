/** Shared secret lookup for JWT sign/verify (Edge-safe). */
export function getJwtSecretKey(): Uint8Array | null {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}
