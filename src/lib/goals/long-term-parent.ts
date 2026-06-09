import { getNeonSql } from "@/lib/neon/client";

type NeonSql = NonNullable<ReturnType<typeof getNeonSql>>;

/** True when `parentId` is a one-year or strategic goal row owned by `userId`. */
export async function isLongTermGoalOwnedByUser(
  sql: NeonSql,
  userId: string,
  parentId: string,
): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM public.app_goals
    WHERE id = ${parentId}::uuid
      AND user_id = ${userId}::uuid
      AND horizon IN ('one_year', 'long_term')
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

/** True when `parentId` is a vision (5/10/20y) goal owned by `userId`. */
export async function isVisionParentGoalOwnedByUser(
  sql: NeonSql,
  userId: string,
  parentId: string,
): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM public.app_goals
    WHERE id = ${parentId}::uuid
      AND user_id = ${userId}::uuid
      AND horizon IN ('vision_5', 'vision_10', 'vision_20')
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

