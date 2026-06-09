import type { GoalHorizon } from "@/lib/crm/types";

export const GOAL_HORIZONS: readonly GoalHorizon[] = [
  "short_term",
  "one_year",
  "long_term",
  "vision_5",
  "vision_10",
  "vision_20",
] as const;

export function isGoalHorizon(v: unknown): v is GoalHorizon {
  return (
    typeof v === "string" &&
    GOAL_HORIZONS.includes(v as GoalHorizon)
  );
}

/** Near-term lanes roll up to a one-year or strategic parent. */
export function needsStrategicParent(horizon: GoalHorizon): boolean {
  return horizon === "short_term";
}

/** Valid parent horizons when linking short-term goals upward. */
export function isShortTermRollupParent(horizon: GoalHorizon): boolean {
  return horizon === "one_year" || horizon === "long_term";
}

/** One-year and strategic lanes may optionally anchor to any vision (5/10/20y) outcome. */
export function supportsOptionalVisionParent(horizon: GoalHorizon): boolean {
  return horizon === "one_year" || horizon === "long_term";
}

export function isVisionHorizon(h: GoalHorizon): boolean {
  return (
    h === "vision_5" || h === "vision_10" || h === "vision_20"
  );
}

/** Full editor / API horizon pick list */
export const GOAL_HORIZON_FORM_OPTIONS: {
  value: GoalHorizon;
  label: string;
  hint: string;
}[] = [
  {
    value: "short_term",
    label: "Short-term",
    hint: "~30–90 days · rolls up to one-year or strategic",
  },
  {
    value: "one_year",
    label: "One-year",
    hint: "12-month outcomes · annual cadence",
  },
  {
    value: "long_term",
    label: "Strategic",
    hint: "Multi-quarter north star beyond a single year",
  },
  {
    value: "vision_5",
    label: "Vision · 5 years",
    hint: "Medium arc - leverage and craft",
  },
  {
    value: "vision_10",
    label: "Vision · 10 years",
    hint: "Decadal posture - legacy & systems",
  },
  {
    value: "vision_20",
    label: "Vision · 20 years",
    hint: "Generational compass - identity-level",
  },
];

export function goalAddFormBeatsLine(h: GoalHorizon): string {
  if (h === "short_term") {
    return "Link to a one-year or strategic parent, name the outcome, tune tracking.";
  }
  if (h === "one_year") {
    return "Name the twelve-month win, sketch how you'll measure it, tune tracking.";
  }
  if (isVisionHorizon(h)) {
    return "Declare the directional outcome, sketch how you'd know you've arrived, tune tracking.";
  }
  return "Name the posture, sketch how you'll measure momentum, tune tracking.";
}

/** Human-readable title for dialogs and columns */
export function goalHorizonHumanTitle(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "Short-term";
    case "one_year":
      return "One-year";
    case "long_term":
      return "Long-term";
    case "vision_5":
      return "Five-year vision";
    case "vision_10":
      return "Ten-year vision";
    case "vision_20":
      return "Twenty-year vision";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

/** Badge / pill abbreviation */
export function goalHorizonBadge(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "30–90 d";
    case "one_year":
      return "1 yr";
    case "long_term":
      return "Strategic";
    case "vision_5":
      return "5 yr";
    case "vision_10":
      return "10 yr";
    case "vision_20":
      return "20 yr";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

/** Compact CTA labelling */
export function goalHorizonAddCtaLabel(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "Add near-term";
    case "one_year":
      return "Add one-year";
    case "long_term":
      return "Add strategic";
    case "vision_5":
      return "Add 5-year";
    case "vision_10":
      return "Add 10-year";
    case "vision_20":
      return "Add 20-year";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

/** Header badge + outline trigger tint */
export function goalHorizonRibbonClass(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100/90";
    case "one_year":
      return "border-sky-400/35 bg-sky-500/10 text-sky-100/95";
    case "long_term":
      return "border-violet-400/30 bg-violet-500/10 text-violet-100/90";
    case "vision_5":
      return "border-cyan-400/35 bg-cyan-500/[0.11] text-cyan-50/95";
    case "vision_10":
      return "border-rose-400/35 bg-rose-500/[0.11] text-rose-50/95";
    case "vision_20":
      return "border-fuchsia-400/35 bg-fuchsia-500/[0.11] text-fuchsia-50/95";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

export function goalHorizonTriggerRingClass(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "border-amber-400/25 hover:border-amber-400/45 hover:bg-amber-500/[0.06]";
    case "one_year":
      return "border-sky-400/25 hover:border-sky-400/45 hover:bg-sky-500/[0.06]";
    case "long_term":
      return "border-violet-400/25 hover:border-violet-400/45 hover:bg-violet-500/[0.06]";
    case "vision_5":
      return "border-cyan-400/25 hover:border-cyan-400/45 hover:bg-cyan-500/[0.06]";
    case "vision_10":
      return "border-rose-400/25 hover:border-rose-400/45 hover:bg-rose-500/[0.06]";
    case "vision_20":
      return "border-fuchsia-400/25 hover:border-fuchsia-400/45 hover:bg-fuchsia-500/[0.06]";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

export function goalBoardColumnEyebrow(h: GoalHorizon): string {
  if (needsStrategicParent(h)) return "Near-term horizon · full board";
  if (h === "one_year") return "One-year horizon · full board";
  if (isVisionHorizon(h)) return "Ultra-long horizon · full board";
  return "Strategic horizon · full board";
}

export function goalSpotlightLaneLabel(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "30–90 days";
    case "one_year":
      return "Twelve-month arc";
    case "long_term":
      return "Strategic runway";
    case "vision_5":
      return "Five-year vista";
    case "vision_10":
      return "Decade compass";
    case "vision_20":
      return "Twenty-year imprint";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

export function goalSpotlightEmptyCue(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "near-term win";
    case "one_year":
      return "one-year outcome";
    case "long_term":
      return "strategic trajectory";
    case "vision_5":
      return "five-year vista";
    case "vision_10":
      return "decade-spanning pillar";
    case "vision_20":
      return "lifetime-scale north star";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}
