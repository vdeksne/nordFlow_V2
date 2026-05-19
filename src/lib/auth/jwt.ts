import { SignJWT, jwtVerify } from "jose";

import { getJwtSecretKey } from "./jwt-secret";

export type SessionClaims = {
  userId: string;
  email: string;
  name: string;
};

export async function signSessionToken(
  claims: SessionClaims,
): Promise<string> {
  const key = getJwtSecretKey();
  if (!key) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters.");
  }

  return new SignJWT({
    email: claims.email,
    name: claims.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  const key = getJwtSecretKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : "";
    if (!userId || !email) return null;
    return { userId, email, name };
  } catch {
    return null;
  }
}
