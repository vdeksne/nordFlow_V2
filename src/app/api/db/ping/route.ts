import { NextResponse } from "next/server";

import { getNeonSql } from "@/lib/neon/client";

/**
 * GET /api/db/ping — verifies Neon connectivity (server-only).
 */
export async function GET() {
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const rows = await sql`SELECT 1 AS ping`;
    const ping = rows[0] as { ping?: number } | undefined;
    return NextResponse.json({
      ok: true,
      ping: ping?.ping ?? null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database connection failed" },
      { status: 500 },
    );
  }
}
