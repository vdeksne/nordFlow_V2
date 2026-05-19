import { NextResponse } from "next/server";

import { isCredentialAuthConfigured } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/jwt";
import { readSessionTokenFromCookies } from "@/lib/auth/session-cookie";

export async function GET() {
  if (!isCredentialAuthConfigured()) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const token = await readSessionTokenFromCookies();
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
    },
  });
}
