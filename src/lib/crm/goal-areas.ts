/** Goal domain taxonomy — stored as snake_case in DB/API (`area` column). */

export type GoalArea =
  | "self"
  | "work"
  | "money"
  | "relationships"
  | "meaning"
  | "body";

export const GOAL_AREA_OPTIONS: {
  value: GoalArea;
  domain: string;
  function: string;
}[] = [
  { value: "self", domain: "Self", function: "Awareness" },
  { value: "work", domain: "Work", function: "Output" },
  { value: "money", domain: "Money", function: "Stability" },
  {
    value: "relationships",
    domain: "Relationships",
    function: "Connection",
  },
  { value: "meaning", domain: "Meaning", function: "Purpose" },
  { value: "body", domain: "Body", function: "Energy" },
];

export const GOAL_AREA_ORDER: GoalArea[] = GOAL_AREA_OPTIONS.map((o) => o.value);

export function isGoalAreaString(v: string): v is GoalArea {
  return GOAL_AREA_OPTIONS.some((o) => o.value === v);
}

/** API/body validator: empty clears label; otherwise must be a known domain key. */
export function isGoalAreaField(
  v: unknown,
): v is GoalArea | null | undefined | "" {
  if (v === null || v === undefined || v === "") return true;
  return typeof v === "string" && isGoalAreaString(v);
}

/** Short badge label — domain name */
export function goalAreaDomain(area: GoalArea): string {
  return GOAL_AREA_OPTIONS.find((o) => o.value === area)?.domain ?? area;
}

/** Single-line label for selects */
export function goalAreaOptionLabel(area: GoalArea): string {
  const o = GOAL_AREA_OPTIONS.find((x) => x.value === area);
  return o ? `${o.domain} — ${o.function}` : area;
}

/** Badge / selectable chip styling — matches CRM goals surfaces */
export function goalAreaPillClass(area: GoalArea | null): string {
  switch (area) {
    case "self":
      return "border-violet-400/35 bg-violet-500/12 text-violet-100/95";
    case "work":
      return "border-sky-400/35 bg-sky-500/12 text-sky-100/95";
    case "money":
      return "border-amber-400/35 bg-amber-500/12 text-amber-100/95";
    case "relationships":
      return "border-fuchsia-400/35 bg-fuchsia-500/12 text-fuchsia-100/95";
    case "meaning":
      return "border-indigo-400/35 bg-indigo-500/12 text-indigo-100/95";
    case "body":
      return "border-emerald-400/35 bg-emerald-500/12 text-emerald-100/95";
    default:
      return "border-white/[0.1] bg-white/[0.04] text-muted-foreground";
  }
}

/** Maps historical `area` strings (pillars + older layer taxonomy) → current domains */
const LEGACY_AREA_MAP: Record<string, GoalArea> = {
  revenue: "money",
  delivery: "work",
  growth: "meaning",
  health: "body",
  learning: "self",
  relationships: "relationships",
  outreach: "work",
  pipeline: "money",
  brand: "meaning",
  distribution: "work",
  experimentation: "self",
  follow_up: "relationships",
  positioning: "meaning",
};

/** Maps DB/cache legacy `area` strings to current domains; unknown → null */
export function migrateLegacyGoalArea(
  raw: string | null | undefined,
): GoalArea | null {
  if (raw == null || raw === "") return null;
  if (isGoalAreaString(raw)) return raw;
  const mapped = LEGACY_AREA_MAP[raw];
  return mapped ?? null;
}
