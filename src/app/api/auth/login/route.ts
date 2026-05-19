import { NextResponse } from "next/server";

import { isCredentialAuthConfigured } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { normalizeEmail } from "@/lib/auth/validation";
import { getNeonSql } from "@/lib/neon/client";

type Body = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!isCredentialAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Auth is not configured. Set DATABASE_URL and AUTH_SECRET (32+ chars) in .env.local.",
      },
      { status: 503 },
    );
  }

  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json(
      { ok: false, error: "Database connection is not available." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, {
      status: 400,
    });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password required." },
      { status: 400 },
    );
  }

  const rows = await sql`
    SELECT id::text AS id, email, password_hash, full_name
    FROM public.app_users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;

  const row = rows[0] as
    | {
        id: string;
        email: string;
        password_hash: string;
        full_name: string;
      }
    | undefined;

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = await signSessionToken({
    userId: row.id,
    email: row.email,
    name: row.full_name ?? "",
  });

  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: {
      id: row.id,
      email: row.email,
      name: row.full_name ?? "",
    },
  });
}
