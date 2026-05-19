import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isCredentialAuthConfigured } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/register" || pathname.startsWith("/register/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isCredentialAuthConfigured()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !isPublicPath(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (
    session &&
    (pathname === "/login" || pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
