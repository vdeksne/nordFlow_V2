"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bolt,
  CalendarRange,
  CheckCircle2,
  Compass,
  Crosshair,
  Orbit,
  Sparkles,
  Telescope,
} from "lucide-react";
import { useMemo, useState } from "react";

import { CrmPage } from "@/components/Crm/CrmPage";
import { Button } from "@/components/Ui/Button";
import {
  goalAreaDomain,
  goalAreaPillClass,
  type GoalArea,
} from "@/lib/crm/goal-areas";
import {
  GOAL_HORIZON_FORM_OPTIONS,
  goalHorizonBadge,
  goalHorizonRibbonClass,
  needsStrategicParent,
  isShortTermRollupParent,
  supportsOptionalVisionParent,
} from "@/lib/crm/goal-horizons";
import { goalIsReachedArchive } from "@/lib/crm/goal-archive";
import type { Goal, GoalHorizon } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { GoalDetailSheet } from "./GoalDetailSheet";
import { useGoals } from "./GoalsContext";

function areaShort(area: GoalArea | null): string {
  return area ? goalAreaDomain(area) : "General";
}

const FILTER_OPTIONS: { id: "all" | GoalHorizon; label: string }[] = [
  { id: "all", label: "All wins" },
  { id: "short_term", label: "Near-term" },
  { id: "one_year", label: "One-year" },
  { id: "long_term", label: "Strategic" },
  ...GOAL_HORIZON_FORM_OPTIONS.filter(
    (o) =>
      o.value !== "short_term" &&
      o.value !== "one_year" &&
      o.value !== "long_term",
  ).map((o) => ({
    id: o.value,
    label: o.label.replace(/^Vision · /, "").replace(/ years?$/, "-yr"),
  })),
];

function archiveCardTopAccentClass(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return "via-amber-400/50";
    case "one_year":
      return "via-sky-400/55";
    case "long_term":
      return "via-violet-400/50";
    case "vision_5":
      return "via-cyan-400/55";
    case "vision_10":
      return "via-rose-400/55";
    case "vision_20":
      return "via-fuchsia-400/55";
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

function ReachedGoalCard({
  goal,
  parentLongTitle,
  visionAnchoredTitle,
  onOpen,
}: {
  goal: Goal;
  parentLongTitle?: string | null;
  visionAnchoredTitle?: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group border-white/8 bg-[color-mix(in_oklab,var(--card)_58%,transparent)] hover:border-emerald-400/25 relative flex w-full flex-col overflow-hidden rounded-none border text-left shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] backdrop-blur-md transition-all duration-300",
        "hover:shadow-[0_24px_80px_-48px_rgba(16,185,129,0.35)]",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80",
          archiveCardTopAccentClass(goal.horizon),
        )}
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-none border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
              goalHorizonRibbonClass(goal.horizon),
            )}
          >
            {goalHorizonBadge(goal.horizon)}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase",
              goalAreaPillClass(goal.area),
            )}
          >
            {areaShort(goal.area)}
          </span>
          <span className="text-emerald-300/95 ml-auto font-mono text-[11px] font-bold tabular-nums tracking-tight">
            100%
          </span>
        </div>

        <h3 className="text-foreground group-hover:text-emerald-100/95 mt-3 line-clamp-2 text-[15px] leading-snug font-semibold tracking-tight transition-colors">
          {goal.title}
        </h3>

        {needsStrategicParent(goal.horizon) && parentLongTitle ? (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-[11px] leading-relaxed">
            Rolled up to · {parentLongTitle}
          </p>
        ) : null}

        {supportsOptionalVisionParent(goal.horizon) &&
        visionAnchoredTitle ? (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-[11px] leading-relaxed">
            Anchored to · {visionAnchoredTitle}
          </p>
        ) : null}

        {goal.metric ? (
          <p className="text-muted-foreground/90 mt-2 line-clamp-2 text-xs leading-relaxed">
            {goal.metric}
          </p>
        ) : null}

        <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-3 text-[11px] tabular-nums">
          {goal.targetDate ? (
            <span>Target · {goal.targetDate}</span>
          ) : null}
          <span className="text-muted-foreground/75">
            Logged · {goal.updatedAt}
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute right-4 bottom-4 font-mono text-[56px] font-black tabular-nums text-emerald-500/[0.07] transition-opacity duration-300 group-hover:text-emerald-400/10"
        aria-hidden
      >
        ✓
      </div>
    </button>
  );
}

export function GoalsArchiveClient() {
  const { goals, goalsApiUnreachable, goalsLoadError, retryGoalsFromApi } =
    useGoals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [horizonFilter, setHorizonFilter] = useState<"all" | GoalHorizon>(
    "all",
  );

  const longTitleById = useMemo(
    () =>
      Object.fromEntries(
        goals
          .filter((g) => isShortTermRollupParent(g.horizon))
          .map((g) => [g.id, g.title] as const),
      ),
    [goals],
  );

  const visionTitleById = useMemo(
    () =>
      Object.fromEntries(
        goals
          .filter(
            (g) =>
              g.horizon === "vision_5" ||
              g.horizon === "vision_10" ||
              g.horizon === "vision_20",
          )
          .map((g) => [g.id, g.title] as const),
      ),
    [goals],
  );

  const reached = useMemo(() => {
    const list = goals.filter(goalIsReachedArchive);
    const filtered =
      horizonFilter === "all"
        ? list
        : list.filter((g) => g.horizon === horizonFilter);
    return [...filtered].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [goals, horizonFilter]);

  const counts = useMemo(() => {
    const r = goals.filter(goalIsReachedArchive);
    return {
      all: r.length,
      short_term: r.filter((g) => g.horizon === "short_term").length,
      one_year: r.filter((g) => g.horizon === "one_year").length,
      long_term: r.filter((g) => g.horizon === "long_term").length,
      vision_5: r.filter((g) => g.horizon === "vision_5").length,
      vision_10: r.filter((g) => g.horizon === "vision_10").length,
      vision_20: r.filter((g) => g.horizon === "vision_20").length,
    };
  }, [goals]);

  const selectedGoal = useMemo(
    () =>
      selectedId ? (goals.find((g) => g.id === selectedId) ?? null) : null,
    [goals, selectedId],
  );

  return (
    <CrmPage
      title="Goals archive"
      subtitle="Every outcome that hit 100% - your wins vault. Open a card to revisit or tweak details."
    >
      <div className="dashboard-focus space-y-8 sm:space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/goals"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-[12px] font-semibold tracking-wide uppercase transition-colors"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to active goals
          </Link>
        </div>

        {goalsApiUnreachable ? (
          <div
            role="status"
            className="border-amber-400/35 bg-amber-500/10 text-foreground flex flex-col gap-3 rounded-none border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1 text-[13px] leading-relaxed">
              <p className="font-medium">Goals couldn&apos;t sync.</p>
              {goalsLoadError ? (
                <p className="text-muted-foreground">{goalsLoadError}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-white/15 shrink-0 rounded-none"
              onClick={() => retryGoalsFromApi()}
            >
              Retry sync
            </Button>
          </div>
        ) : null}

        <section
          className={cn(
            "relative overflow-hidden rounded-none border border-white/[0.08] p-6 sm:p-8",
            "bg-gradient-to-br from-emerald-500/[0.14] via-[color-mix(in_oklab,var(--card)_50%,transparent)] to-violet-500/[0.08]",
            "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05)]",
          )}
        >
          <div className="absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b from-emerald-400/90 to-emerald-600/30" />
          <div className="relative flex flex-col gap-6 pl-3 sm:flex-row sm:items-center sm:justify-between sm:pl-5">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span className="bg-emerald-500/15 text-emerald-200 ring-emerald-400/22 inline-flex size-12 shrink-0 items-center justify-center rounded-none ring-1">
                <CheckCircle2 className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
                  Wins vault
                </p>
                <p className="text-foreground mt-1 text-2xl font-semibold tracking-tight sm:text-3xl tabular-nums">
                  {counts.all}{" "}
                  <span className="text-muted-foreground text-lg font-medium sm:text-xl">
                    reached at 100%
                  </span>
                </p>
                <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <Bolt className="text-amber-400/90 size-3.5" aria-hidden />
                    {counts.short_term} near-term
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarRange
                      className="text-sky-300/90 size-3.5"
                      aria-hidden
                    />
                    {counts.one_year} one-year
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Compass
                      className="text-violet-300/90 size-3.5"
                      aria-hidden
                    />
                    {counts.long_term} strategic
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Telescope
                      className="text-cyan-300/90 size-3.5"
                      aria-hidden
                    />
                    {counts.vision_5} · 5-yr vision
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Orbit className="text-rose-300/90 size-3.5" aria-hidden />
                    {counts.vision_10} · 10-yr vision
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles
                      className="text-fuchsia-300/90 size-3.5"
                      aria-hidden
                    />
                    {counts.vision_20} · 20-yr vision
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-[10px] font-bold tracking-[0.16em] uppercase">
              Filter
            </span>
            {FILTER_OPTIONS.map((opt) => {
              const n =
                opt.id === "all"
                  ? counts.all
                  : counts[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setHorizonFilter(opt.id)}
                  className={cn(
                    "rounded-none border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                    horizonFilter === opt.id
                      ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-100 ring-1 ring-emerald-400/20"
                      : "border-white/10 bg-black/15 text-muted-foreground hover:border-white/18 hover:text-foreground",
                  )}
                >
                  {opt.label}
                  <span className="text-muted-foreground/80 ml-1.5 tabular-nums">
                    ({n})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {reached.length === 0 ? (
          <div className="border-white/10 bg-white/[0.02] rounded-none border px-8 py-20 text-center">
            <Crosshair className="text-muted-foreground/40 mx-auto size-12" />
            <p className="text-foreground mt-6 text-lg font-semibold tracking-tight">
              No finished goals yet
            </p>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
              When an active goal reaches{" "}
              <strong className="text-foreground font-semibold">100%</strong>{" "}
              progress, it appears here automatically.
            </p>
            <Link
              href="/goals"
              className="text-primary hover:text-primary/85 mt-8 inline-flex text-[11px] font-semibold tracking-wide uppercase underline-offset-4 hover:underline"
            >
              Go to goals
            </Link>
          </div>
        ) : (
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
            {reached.map((g) => (
              <li key={g.id}>
                <ReachedGoalCard
                  goal={g}
                  parentLongTitle={
                    needsStrategicParent(g.horizon) && g.longTermGoalId
                      ? longTitleById[g.longTermGoalId]
                      : undefined
                  }
                  visionAnchoredTitle={
                    supportsOptionalVisionParent(g.horizon) &&
                    g.visionParentGoalId
                      ? visionTitleById[g.visionParentGoalId]
                      : undefined
                  }
                  onOpen={() => setSelectedId(g.id)}
                />
              </li>
            ))}
          </ul>
        )}

        <GoalDetailSheet
          goal={selectedGoal}
          open={selectedId !== null && selectedGoal !== null}
          onOpenChange={(next) => {
            if (!next) setSelectedId(null);
          }}
        />
      </div>
    </CrmPage>
  );
}
