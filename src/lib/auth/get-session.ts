import { verifySessionToken, type SessionClaims } from "@/lib/auth/jwt";
import { readSessionTokenFromCookies } from "@/lib/auth/session-cookie";

/** Resolves the current credential-auth session from the request cookie. */
export async function getSessionFromCookies(): Promise<SessionClaims | null> {
  const token = await readSessionTokenFromCookies();
  if (!token) return null;
  return verifySessionToken(token);
}
