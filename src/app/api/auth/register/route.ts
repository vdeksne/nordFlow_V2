import { NextResponse } from "next/server";

import { isCredentialAuthConfigured } from "@/lib/auth/config";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import {
  normalizeEmail,
  normalizeFullName,
} from "@/lib/auth/validation";
import { getNeonSql } from "@/lib/neon/client";

type Body = {
  email?: string;
  password?: string;
  fullName?: string;
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
  const fullName = normalizeFullName(body.fullName);

  if (!email) {
    return NextResponse.json({ ok: false, error: "Valid email required." }, {
      status: 400,
    });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);

  try {
    const inserted = await sql`
      INSERT INTO public.app_users (email, password_hash, full_name)
      VALUES (${email}, ${passwordHash}, ${fullName})
      RETURNING id::text AS id, email, full_name
    `;

    const row = inserted[0] as
      | { id: string; email: string; full_name: string }
      | undefined;

    if (!row?.id) {
      return NextResponse.json(
        { ok: false, error: "Could not create account." },
        { status: 500 },
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("duplicate key") ||
      msg.includes("unique constraint") ||
      msg.includes("already exists")
    ) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    console.error("[auth/register]", e);
    return NextResponse.json(
      { ok: false, error: "Registration failed. Try again." },
      { status: 500 },
    );
  }
}
