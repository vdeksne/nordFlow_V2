import type { Goal } from "@/lib/crm/types";

function normalizedProgressPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Goals that hit full progress - shown in the wins / archive view. */
export function goalIsReachedArchive(g: Goal): boolean {
  return normalizedProgressPct(g.progress) >= 100;
}
