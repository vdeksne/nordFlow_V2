"use client";

import type { LucideIcon } from "lucide-react";
import { Bolt, CalendarRange, CheckCircle2, Compass, Crosshair, Orbit, Telescope, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CrmPage } from "@/components/Crm/CrmPage";
import { Button } from "@/components/Ui/Button";
import { goalIsReachedArchive } from "@/lib/crm/goal-archive";
import {
  goalAreaDomain,
  goalAreaPillClass,
  type GoalArea,
} from "@/lib/crm/goal-areas";
import {
  goalBoardColumnEyebrow,
  goalSpotlightEmptyCue,
  goalSpotlightLaneLabel,
  isShortTermRollupParent,
  needsStrategicParent,
  supportsOptionalVisionParent,
} from "@/lib/crm/goal-horizons";
import type { Goal, GoalHorizon } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { AddGoalSheet } from "./AddGoalSheet";
import { GoalDetailSheet } from "./GoalDetailSheet";
import { GoalsCharts } from "./GoalsCharts";
import { normalizeGoalProgress, useGoals } from "./GoalsContext";

function areaShort(area: GoalArea | null): string {
  return area ? goalAreaDomain(area) : "General";
}

function statusTone(status: Goal["status"]): string {
  switch (status) {
    case "completed":
      return "text-emerald-300/95";
    case "archived":
      return "text-muted-foreground";
    default:
      return "text-primary";
  }
}

function goalsForHorizon(goals: Goal[], horizon: GoalHorizon): Goal[] {
  return [...goals]
    .filter((g) => g.horizon === horizon)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

function goalsSpotlightList(goals: Goal[], limit: number): Goal[] {
  const active = goals.filter((g) => g.status === "active");
  const pool = active.length ? active : goals.filter((g) => g.status !== "archived");
  return pool.slice(0, limit);
}

function avgProgress(goals: Goal[]): number | null {
  if (!goals.length) return null;
  const sum = goals.reduce((s, g) => s + g.progress, 0);
  return Math.round(sum / goals.length);
}

function SpotlightGoalRow({
  goal,
  onOpen,
  parentLongTitle,
  visionAnchoredTitle,
}: {
  goal: Goal;
  onOpen: () => void;
  /** Shown under title when this is a short-term goal linked to a long-term parent */
  parentLongTitle?: string | null;
  /** Strategy row linked to ultra-long vision */
  visionAnchoredTitle?: string | null;
}) {
  const done = goal.status === "completed";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group border-sidebar-border hover:border-primary/35 w-full rounded-none border border-white/[0.08] bg-black/20 px-3.5 py-3 text-left transition-all duration-300",
          "hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]",
          done && "opacity-75",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-foreground line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug font-semibold tracking-tight",
              done && "text-muted-foreground line-through decoration-white/20",
            )}
          >
            {goal.title}
          </p>
          <span className="text-primary group-hover:text-primary/90 shrink-0 font-mono text-[11px] font-bold tabular-nums">
            {goal.progress}%
          </span>
        </div>
        {needsStrategicParent(goal.horizon) && parentLongTitle ? (
          <p className="text-muted-foreground mt-2 line-clamp-1 text-[10px] leading-snug">
            Rolls up to · {parentLongTitle}
          </p>
        ) : null}
        {supportsOptionalVisionParent(goal.horizon) &&
        visionAnchoredTitle ? (
          <p className="text-muted-foreground mt-2 line-clamp-1 text-[10px] leading-snug">
            Anchored to · {visionAnchoredTitle}
          </p>
        ) : null}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="bg-white/[0.07] h-1 min-w-0 flex-1 overflow-hidden rounded-none">
            <div
              className="bg-primary/80 h-full rounded-none transition-[width] duration-500"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
              goalAreaPillClass(goal.area),
            )}
          >
            {areaShort(goal.area)}
          </span>
        </div>
      </button>
    </li>
  );
}

function GoalsHorizonSpotlight({
  horizon,
  title,
  tagline,
  goals,
  accent,
  Icon,
  onOpenGoal,
  longTitleById,
  visionTitleById,
}: {
  horizon: GoalHorizon;
  title: string;
  tagline: string;
  goals: Goal[];
  accent:
    | "short"
    | "year1"
    | "long"
    | "vision5"
    | "vision10"
    | "vision20";
  Icon: LucideIcon;
  onOpenGoal: (id: string) => void;
  longTitleById: Record<string, string>;
  /** For strategic spotlight - resolves optional vision anchors */
  visionTitleById?: Record<string, string>;
}) {
  const spotlight = goalsSpotlightList(goals, 4);
  const activeGoals = goals.filter((g) => g.status === "active");
  const activeCount = activeGoals.length;
  const avg = avgProgress(activeGoals);
  const laneEyebrow = goalSpotlightLaneLabel(horizon);
  const emptyCue = goalSpotlightEmptyCue(horizon);

  const shell =
    accent === "short"
      ? "from-amber-500/[0.12] via-[color-mix(in_oklab,var(--card)_55%,transparent)] to-cyan-500/[0.06]"
      : accent === "year1"
        ? "from-sky-500/[0.13] via-[color-mix(in_oklab,var(--card)_55%,transparent)] to-cyan-500/[0.06]"
        : accent === "long"
        ? "from-violet-500/[0.14] via-[color-mix(in_oklab,var(--card)_55%,transparent)] to-sky-500/[0.05]"
        : accent === "vision5"
          ? "from-cyan-500/[0.13] via-[color-mix(in_oklab,var(--card)_55%,transparent)] to-emerald-500/[0.06]"
          : accent === "vision10"
            ? "from-rose-500/[0.13] via-[color-mix(in_oklab,var(--card)_55%,transparent)] to-orange-500/[0.05]"
            : "from-fuchsia-500/[0.14] via-[color-mix(in_oklab,var(--card)_55%,transparent)] to-violet-500/[0.07]";

  const corner =
    accent === "short"
      ? "text-amber-400/90"
      : accent === "year1"
        ? "text-sky-300/90"
        : accent === "long"
        ? "text-violet-300/90"
        : accent === "vision5"
          ? "text-cyan-300/90"
          : accent === "vision10"
            ? "text-rose-300/90"
            : "text-fuchsia-300/90";

  const rail =
    accent === "short"
      ? "bg-gradient-to-b from-amber-400/80 to-amber-600/40"
      : accent === "year1"
        ? "bg-gradient-to-b from-sky-400/80 to-cyan-600/40"
        : accent === "long"
        ? "bg-gradient-to-b from-violet-400/80 to-indigo-600/40"
        : accent === "vision5"
          ? "bg-gradient-to-b from-cyan-400/80 to-teal-600/40"
          : accent === "vision10"
            ? "bg-gradient-to-b from-rose-400/80 to-orange-700/38"
            : "bg-gradient-to-b from-fuchsia-400/80 to-purple-700/42";

  return (
    <div
      className={cn(
        "relative flex min-h-[280px] flex-col overflow-hidden rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_60%,transparent)] p-5 sm:p-6",
        "bg-gradient-to-br shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05)]",
        shell,
      )}
    >
      <div
        className={cn("absolute top-0 left-0 h-full w-[3px]", rail)}
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col pl-3 sm:pl-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-none border border-white/[0.1] bg-black/25",
                corner,
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.22em] uppercase">
                {laneEyebrow}
              </p>
              <h3 className="text-foreground mt-1 text-lg font-semibold tracking-tight sm:text-xl">
                {title}
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-[13px] leading-relaxed">
                {tagline}
              </p>
            </div>
          </div>
          <AddGoalSheet horizon={horizon} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-4 text-[11px] tabular-nums">
          <span className="text-foreground font-semibold">
            {activeCount} active
          </span>
          {avg !== null ? (
            <span className="text-muted-foreground">
              Blend ·{" "}
              <span className="text-foreground font-semibold">{avg}%</span> avg
              progress
            </span>
          ) : (
            <span className="text-muted-foreground">No active goals yet</span>
          )}
        </div>

        <div className="mt-4 flex flex-1 flex-col">
          <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-[0.18em] uppercase">
            Your goals here
          </p>
          {spotlight.length === 0 ? (
            <div className="text-muted-foreground/85 flex flex-1 flex-col items-center justify-center rounded-none border border-dashed border-white/[0.08] bg-black/15 px-4 py-10 text-center text-sm leading-relaxed">
              Nothing queued yet - add your first {emptyCue}.
            </div>
          ) : (
            <ul className="flex flex-col gap-2 p-0">
              {spotlight.map((g) => (
                <SpotlightGoalRow
                  key={g.id}
                  goal={g}
                  parentLongTitle={
                    needsStrategicParent(g.horizon) && g.longTermGoalId
                      ? longTitleById[g.longTermGoalId]
                      : undefined
                  }
                  visionAnchoredTitle={
                    supportsOptionalVisionParent(g.horizon) &&
                    g.visionParentGoalId
                      ? visionTitleById?.[g.visionParentGoalId]
                      : undefined
                  }
                  onOpen={() => onOpenGoal(g.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onOpen,
  onProgressChange,
  parentLongTitle,
  visionAnchoredTitle,
}: {
  goal: Goal;
  onOpen: () => void;
  onProgressChange: (value: number) => void;
  parentLongTitle?: string | null;
  visionAnchoredTitle?: string | null;
}) {
  const disabled = goal.status !== "active";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_70%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] backdrop-blur-md transition-colors",
        goal.status === "completed" && "opacity-85",
        goal.status === "archived" && "opacity-65",
      )}
    >
      <button
        type="button"
        className="hover:bg-white/[0.02] w-full px-4 pt-4 pb-3 text-left transition-colors"
        onClick={onOpen}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              goalAreaPillClass(goal.area),
            )}
          >
            {areaShort(goal.area)}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold capitalize tracking-wide",
              statusTone(goal.status),
            )}
          >
            {goal.status.replace("_", " ")}
          </span>
        </div>
        <h3 className="text-foreground mt-3 line-clamp-2 text-[15px] leading-snug font-semibold tracking-tight">
          {goal.title}
        </h3>
        {needsStrategicParent(goal.horizon) && parentLongTitle ? (
          <p className="text-muted-foreground mt-1.5 line-clamp-2 text-[11px] leading-snug">
            Supports · {parentLongTitle}
          </p>
        ) : null}
        {supportsOptionalVisionParent(goal.horizon) &&
        visionAnchoredTitle ? (
          <p className="text-muted-foreground mt-1.5 line-clamp-2 text-[11px] leading-snug">
            Anchored to · {visionAnchoredTitle}
          </p>
        ) : null}
        {goal.metric ? (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-relaxed">
            {goal.metric}
          </p>
        ) : null}
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
          {goal.targetDate ? (
            <span>Target · {goal.targetDate}</span>
          ) : (
            <span>No target date</span>
          )}
          <span className="text-muted-foreground/70">
            Updated {goal.updatedAt}
          </span>
        </div>
      </button>

      <div className="border-t border-white/[0.06] px-4 pb-3 pt-2">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={`goal-progress-${goal.id}`}
            className="text-muted-foreground shrink-0 text-[10px] font-semibold uppercase tracking-wide"
          >
            Progress
          </label>
          <span className="text-foreground font-mono text-[11px] font-semibold tabular-nums">
            {goal.progress}%
          </span>
        </div>
        <input
          id={`goal-progress-${goal.id}`}
          type="range"
          min={0}
          max={100}
          disabled={disabled}
          value={goal.progress}
          onChange={(e) =>
            onProgressChange(normalizeGoalProgress(Number(e.target.value)))
          }
          className={cn(
            "accent-primary mt-1.5 h-2 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
          )}
          aria-label={`Progress for ${goal.title}`}
        />
      </div>
    </article>
  );
}

function GoalsColumn({
  horizon,
  title,
  hint,
  goals,
  onOpenGoal,
  onProgressChange,
  longTitleById,
  visionTitleById,
}: {
  horizon: GoalHorizon;
  title: string;
  hint: string;
  goals: Goal[];
  onOpenGoal: (id: string) => void;
  onProgressChange: (id: string, value: number) => void;
  longTitleById: Record<string, string>;
  visionTitleById?: Record<string, string>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">
            {goalBoardColumnEyebrow(horizon)}
          </p>
          <h2 className="text-foreground mt-1 text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-md text-sm leading-relaxed">
            {hint}
          </p>
        </div>
        <AddGoalSheet horizon={horizon} />
      </div>

      {goals.length === 0 ? (
        <div className="text-muted-foreground/80 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-12 text-center text-sm">
          Nothing here yet - add one outcome you&apos;ll defend in a weekly
          review.
        </div>
      ) : (
        <ul className="flex list-none flex-col gap-4 p-0">
          {goals.map((g) => (
            <li key={g.id}>
              <GoalCard
                goal={g}
                parentLongTitle={
                  needsStrategicParent(g.horizon) && g.longTermGoalId
                    ? longTitleById[g.longTermGoalId]
                    : undefined
                }
                visionAnchoredTitle={
                  supportsOptionalVisionParent(g.horizon) &&
                  g.visionParentGoalId
                    ? visionTitleById?.[g.visionParentGoalId]
                    : undefined
                }
                onOpen={() => onOpenGoal(g.id)}
                onProgressChange={(v) => onProgressChange(g.id, v)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GoalsPageClient() {
  const { goals, updateGoal, goalsApiUnreachable, goalsLoadError, retryGoalsFromApi } =
    useGoals();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selectedGoal = useMemo(
    () =>
      selectedId ? (goals.find((g) => g.id === selectedId) ?? null) : null,
    [goals, selectedId],
  );

  const shortTerm = useMemo(
    () => goalsForHorizon(goals, "short_term"),
    [goals],
  );
  const oneYear = useMemo(() => goalsForHorizon(goals, "one_year"), [goals]);
  const longTerm = useMemo(() => goalsForHorizon(goals, "long_term"), [goals]);

  const vision5 = useMemo(
    () => goalsForHorizon(goals, "vision_5"),
    [goals],
  );
  const vision10 = useMemo(
    () => goalsForHorizon(goals, "vision_10"),
    [goals],
  );
  const vision20 = useMemo(
    () => goalsForHorizon(goals, "vision_20"),
    [goals],
  );

  const archiveCount = useMemo(
    () => goals.filter(goalIsReachedArchive).length,
    [goals],
  );

  return (
    <CrmPage
      title="Goals"
      subtitle="Quarterly execution, one-year outcomes, strategic runway, and 5 / 10 / 20-year vision lanes - skim above, drill into full boards below."
    >
      <div className="dashboard-focus space-y-8 sm:space-y-10">
        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-white/[0.06] pb-4">
          <Link
            href="/goals/archive"
            className={cn(
              "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-100/90 hover:border-emerald-400/35 hover:bg-emerald-500/10",
              "inline-flex items-center gap-2 rounded-none border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
            )}
          >
            <CheckCircle2 className="size-4 shrink-0 opacity-90" aria-hidden />
            Wins archive
            {archiveCount > 0 ? (
              <span className="bg-emerald-500/25 text-emerald-50 ml-0.5 min-w-[1.25rem] rounded-none px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums">
                {archiveCount}
              </span>
            ) : null}
          </Link>
        </div>
        {goalsApiUnreachable ? (
          <div
            role="status"
            className="border-amber-400/35 bg-amber-500/10 text-foreground flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1 text-[13px] leading-relaxed">
              <p className="font-medium">Goals couldn&apos;t sync from the database.</p>
              {goalsLoadError ? (
                <p className="text-muted-foreground">{goalsLoadError}</p>
              ) : null}
              <p className="text-muted-foreground text-[12px]">
                Until this loads successfully, edits on this page stay in your browser only.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-white/15 shrink-0 rounded-xl"
              onClick={() => retryGoalsFromApi()}
            >
              Retry sync
            </Button>
          </div>
        ) : null}
        <section className="space-y-5" aria-labelledby="goals-spotlight-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="bg-primary/12 text-primary mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-none ring-1 ring-primary/22">
                <Crosshair className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
                  At a glance
                </p>
                <h2
                  id="goals-spotlight-heading"
                  className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  Execution ladder · near-term to one-year to strategic
                </h2>
                <p className="text-muted-foreground mt-1 max-w-2xl text-[13px] leading-relaxed">
                  Near-term commits roll up into twelve-month outcomes, then into
                  multi-quarter posture. Charts and sliders follow further down - plus ultra-long vision spotlights live in the row below this one.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
            <GoalsHorizonSpotlight
              horizon="short_term"
              title="Near-term wins"
              tagline="Concrete outcomes for the next weeks: pipeline moves, launches, renewals."
              goals={shortTerm}
              accent="short"
              Icon={Bolt}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
            />
            <GoalsHorizonSpotlight
              horizon="one_year"
              title="One-year outcomes"
              tagline="Twelve-month arcs: revenue targets, habit stacks, key milestones by year-end."
              goals={oneYear}
              accent="year1"
              Icon={CalendarRange}
              longTitleById={longTitleById}
              visionTitleById={visionTitleById}
              onOpenGoal={setSelectedId}
            />
            <GoalsHorizonSpotlight
              horizon="long_term"
              title="Strategic trajectory"
              tagline="Multi-quarter posture beyond a single year: leverage, craft, resilience."
              goals={longTerm}
              accent="long"
              Icon={Compass}
              longTitleById={longTitleById}
              visionTitleById={visionTitleById}
              onOpenGoal={setSelectedId}
            />
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="goals-vision-spotlights">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
                Super long arc
              </p>
              <h2
                id="goals-vision-spotlights"
                className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
              >
                5-, 10-, and 20-year vision pillars
              </h2>
              <p className="text-muted-foreground mt-1 max-w-2xl text-[13px] leading-relaxed">
                Direction-level arcs beyond multi-quarter runway. Strategies can optionally link upward into any of these vistas - visions themselves stay flat (no chaining).
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
            <GoalsHorizonSpotlight
              horizon="vision_5"
              title="Five-year vista"
              tagline="Half-decade lever: geography, mastery, autonomy, partnerships."
              goals={vision5}
              accent="vision5"
              Icon={Telescope}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
            />
            <GoalsHorizonSpotlight
              horizon="vision_10"
              title="Decadal compass"
              tagline="Institutions built, reputation compounding, health & runway."
              goals={vision10}
              accent="vision10"
              Icon={Orbit}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
            />
            <GoalsHorizonSpotlight
              horizon="vision_20"
              title="Generational imprint"
              tagline="Identity-level arcs - what you refuse to postpone across life eras."
              goals={vision20}
              accent="vision20"
              Icon={Sparkles}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
            />
          </div>
        </section>

        <GoalsCharts goals={goals} />

        <div className="space-y-12">
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
            <GoalsColumn
              horizon="short_term"
              title="Short-term outcomes"
              hint="Next ~30-90 days: sign-offs shipped, pipelines moved, launches landed. Fewer goals beats heroic multitasking."
              goals={shortTerm}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
              onProgressChange={(id, value) =>
                updateGoal(id, { progress: value })
              }
            />
            <GoalsColumn
              horizon="one_year"
              title="One-year board"
              hint="Twelve-month wins you revisit monthly: revenue, health, relationships, craft."
              goals={oneYear}
              longTitleById={longTitleById}
              visionTitleById={visionTitleById}
              onOpenGoal={setSelectedId}
              onProgressChange={(id, value) =>
                updateGoal(id, { progress: value })
              }
            />
            <GoalsColumn
              horizon="long_term"
              title="Strategic runway"
              hint="Multi-quarter posture beyond one year: leverage, revenue mix, durability."
              goals={longTerm}
              longTitleById={longTitleById}
              visionTitleById={visionTitleById}
              onOpenGoal={setSelectedId}
              onProgressChange={(id, value) =>
                updateGoal(id, { progress: value })
              }
            />
          </div>

          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Full boards · ultra-long
            </p>
            <h3 className="text-foreground mt-1 text-lg font-semibold tracking-tight">
              Five, ten & twenty-year vision columns
            </h3>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Larger arcs than strategy - revisit quarterly at most; keep wording uncomfortably vivid.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
            <GoalsColumn
              horizon="vision_5"
              title="Vision · five years"
              hint="Leverage and craft arcs: geography, mastery, autonomy, alliances."
              goals={vision5}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
              onProgressChange={(id, value) =>
                updateGoal(id, { progress: value })
              }
            />
            <GoalsColumn
              horizon="vision_10"
              title="Vision · ten years"
              hint="Decadal institutions: equity, narrative, embodied health."
              goals={vision10}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
              onProgressChange={(id, value) =>
                updateGoal(id, { progress: value })
              }
            />
            <GoalsColumn
              horizon="vision_20"
              title="Vision · twenty years"
              hint="Generational imprint - rarely edited, powerfully remembered."
              goals={vision20}
              longTitleById={longTitleById}
              onOpenGoal={setSelectedId}
              onProgressChange={(id, value) =>
                updateGoal(id, { progress: value })
              }
            />
          </div>
        </div>

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
