import type { Goal, GoalArea, GoalHorizon, GoalStatus } from "@/lib/crm/types";
import { isGoalHorizon } from "@/lib/crm/goal-horizons";

export type GoalRow = {
  id: string;
  horizon: string;
  long_term_goal_id: string | null;
  vision_parent_goal_id: string | null;
  title: string;
  metric: string | null;
  target_date: string | null;
  progress: number;
  status: string;
  area: string | null;
  review_note: string | null;
  sort_order: number;
  updated_at: string;
};

function dateToYmd(value: string | Date | null | undefined): string {
  if (value == null) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function goalFromRow(r: GoalRow): Goal {
  const hz = isGoalHorizon(r.horizon) ? r.horizon : "long_term";
  return {
    id: r.id,
    horizon: hz,
    longTermGoalId:
      r.long_term_goal_id === "" || r.long_term_goal_id == null
        ? null
        : r.long_term_goal_id,
    visionParentGoalId:
      r.vision_parent_goal_id === "" || r.vision_parent_goal_id == null
        ? null
        : r.vision_parent_goal_id,
    title: r.title,
    metric: r.metric,
    targetDate: r.target_date,
    progress: r.progress,
    status: r.status as GoalStatus,
    area: r.area ? (r.area as GoalArea) : null,
    reviewNote: r.review_note,
    sortOrder: r.sort_order,
    updatedAt: dateToYmd(r.updated_at),
  };
}
