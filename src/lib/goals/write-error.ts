import { NextResponse } from "next/server";

/** Map Postgres / driver errors to actionable API responses for goal writes. */
export function goalsWriteErrorResponse(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();

  console.error("[goals write]", e);

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return NextResponse.json(
      { ok: false, error: "Goal id conflict - refresh and try again." },
      { status: 409 },
    );
  }

  if (
    lower.includes("app_goals_horizon_check") ||
    (lower.includes("horizon") && lower.includes("check constraint"))
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Database horizon constraint is outdated. Run db/goals-one-year-horizon-migration.sql in Neon, then retry.",
      },
      { status: 400 },
    );
  }

  if (lower.includes("app_goals_long_term_parent_ck")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Short-term goals need a one-year or strategic parent. Add a parent goal first, or run db/goals-one-year-horizon-migration.sql if saves fail for other horizons.",
      },
      { status: 400 },
    );
  }

  if (lower.includes("app_goals_vision_parent_ck")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Database vision-parent constraint is outdated. Run db/goals-one-year-horizon-migration.sql in Neon, then retry.",
      },
      { status: 400 },
    );
  }

  if (lower.includes("foreign key") && lower.includes("long_term_goal_id")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid parent goal - pick an existing one-year or strategic goal.",
      },
      { status: 400 },
    );
  }

  const detail =
    process.env.NODE_ENV === "development" ? ` ${msg.slice(0, 280)}` : "";

  return NextResponse.json(
    { ok: false, error: `Save failed.${detail}` },
    { status: 500 },
  );
}
