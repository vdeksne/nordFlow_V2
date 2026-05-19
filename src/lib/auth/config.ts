/**
 * Auth is optional for local demos: when unset, CRM stays open and forms show setup hints.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function isJwtConfigured(): boolean {
  const s = process.env.AUTH_SECRET?.trim();
  return Boolean(s && s.length >= 32);
}

export function isCredentialAuthConfigured(): boolean {
  return isDatabaseConfigured() && isJwtConfigured();
}
