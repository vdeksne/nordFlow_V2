import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "./constants";

const WEEK_SEC = 60 * 60 * 24 * 7;

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WEEK_SEC,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

export async function readSessionTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
}
