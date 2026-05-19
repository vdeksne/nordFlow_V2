import { NextResponse } from "next/server";

import { getSessionFromCookies } from "@/lib/auth/get-session";
import { isGoalAreaField } from "@/lib/crm/goal-areas";
import { goalFromRow, type GoalRow } from "@/lib/goals/db-row";
import {
  isLongTermGoalOwnedByUser,
  isVisionParentGoalOwnedByUser,
} from "@/lib/goals/long-term-parent";
import { getNeonSql } from "@/lib/neon/client";
import { isGoalHorizon } from "@/lib/crm/goal-horizons";
import type { GoalStatus } from "@/lib/crm/types";

function isStatus(v: unknown): v is GoalStatus {
  return v === "active" || v === "completed" || v === "archived";
}

type PatchBody = {
  horizon?: unknown;
  longTermGoalId?: unknown;
  visionParentGoalId?: unknown;
  title?: unknown;
  metric?: unknown;
  targetDate?: unknown;
  progress?: unknown;
  status?: unknown;
  area?: unknown;
  reviewNote?: unknown;
  sortOrder?: unknown;
};

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, {
      status: 401,
    });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, {
      status: 400,
    });
  }

  if (!isGoalHorizon(body.horizon)) {
    return NextResponse.json({ ok: false, error: "Invalid horizon" }, {
      status: 400,
    });
  }

  const title =
    typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ ok: false, error: "Title required" }, {
      status: 400,
    });
  }

  if (!isStatus(body.status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, {
      status: 400,
    });
  }

  const areaRaw = body.area;
  if (!isGoalAreaField(areaRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid area" }, {
      status: 400,
    });
  }

  const metric =
    typeof body.metric === "string"
      ? body.metric.trim() || null
      : body.metric === null
        ? null
        : null;

  const targetDate =
    typeof body.targetDate === "string"
      ? body.targetDate.trim() || null
      : body.targetDate === null
        ? null
        : null;

  const progressNum =
    typeof body.progress === "number" && Number.isFinite(body.progress)
      ? Math.min(100, Math.max(0, Math.round(body.progress)))
      : 0;

  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.round(body.sortOrder)
      : 0;

  const reviewNote =
    typeof body.reviewNote === "string"
      ? body.reviewNote.trim() || null
      : body.reviewNote === null
        ? null
        : null;

  const area =
    areaRaw === "" || areaRaw === undefined || areaRaw === null
      ? null
      : areaRaw;

  let longTermGoalId: string | null = null;
  if (body.horizon === "short_term") {
    const rawParent = body.longTermGoalId;
    const pid =
      typeof rawParent === "string" && /^[0-9a-f-]{36}$/i.test(rawParent)
        ? rawParent
        : null;
    if (!pid) {
      return NextResponse.json(
        { ok: false, error: "longTermGoalId required for short-term goals" },
        { status: 400 },
      );
    }
    const okParent = await isLongTermGoalOwnedByUser(sql, session.userId, pid);
    if (!okParent) {
      return NextResponse.json(
        { ok: false, error: "Invalid long-term parent goal" },
        { status: 400 },
      );
    }
    longTermGoalId = pid;
  }

  let visionParentGoalId: string | null = null;
  if (body.horizon === "long_term") {
    const rawVision = body.visionParentGoalId;
    if (rawVision !== undefined && rawVision !== null && rawVision !== "") {
      const vid =
        typeof rawVision === "string" &&
        /^[0-9a-f-]{36}$/i.test(rawVision)
          ? rawVision
          : null;
      if (!vid) {
        return NextResponse.json(
          {
            ok: false,
            error: "visionParentGoalId must be a UUID or empty for strategic goals",
          },
          { status: 400 },
        );
      }
      const okVp = await isVisionParentGoalOwnedByUser(sql, session.userId, vid);
      if (!okVp) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid vision parent goal (must be 5-, 10-, or 20-year vision)",
          },
          { status: 400 },
        );
      }
      visionParentGoalId = vid;
    }
  }

  const updated = await sql`
    UPDATE public.app_goals
    SET horizon = ${body.horizon},
        long_term_goal_id = ${longTermGoalId},
        vision_parent_goal_id = ${visionParentGoalId},
        title = ${title},
        metric = ${metric},
        target_date = ${targetDate},
        progress = ${progressNum},
        status = ${body.status},
        area = ${area},
        review_note = ${reviewNote},
        sort_order = ${sortOrder},
        updated_at = CURRENT_DATE
    WHERE id = ${id}::uuid
      AND user_id = ${session.userId}::uuid
    RETURNING id::text AS id,
              horizon,
              long_term_goal_id::text AS long_term_goal_id,
              vision_parent_goal_id::text AS vision_parent_goal_id,
              title,
              metric,
              target_date,
              progress,
              status,
              area,
              review_note,
              sort_order,
              updated_at::text AS updated_at
  `;

  const row = updated[0] as GoalRow | undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Goal not found" }, {
      status: 404,
    });
  }

  return NextResponse.json({ ok: true, goal: goalFromRow(row) });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, {
      status: 401,
    });
  }

  const deleted = await sql`
    DELETE FROM public.app_goals
    WHERE id = ${id}::uuid AND user_id = ${session.userId}::uuid
    RETURNING id::text AS id
  `;

  if (!(deleted as { id?: string }[])[0]?.id) {
    return NextResponse.json({ ok: false, error: "Goal not found" }, {
      status: 404,
    });
  }

  return NextResponse.json({ ok: true });
}
