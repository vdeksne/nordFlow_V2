"use client";

import { Crosshair } from "lucide-react";
import { useMemo, useState } from "react";

import { CrmPage } from "@/components/Crm/CrmPage";
import type { Goal, GoalArea, GoalHorizon } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { AddGoalSheet } from "./AddGoalSheet";
import { GoalDetailSheet } from "./GoalDetailSheet";
import { GoalsCharts } from "./GoalsCharts";
import { normalizeGoalProgress, useGoals } from "./GoalsContext";

function areaShort(area: GoalArea | null): string {
  switch (area) {
    case "revenue":
      return "Revenue";
    case "delivery":
      return "Delivery";
    case "growth":
      return "Growth";
    case "health":
      return "Health";
    case "learning":
      return "Learning";
    case "relationships":
      return "Relationships";
    default:
      return "General";
  }
}

function areaBadgeClass(area: GoalArea | null): string {
  switch (area) {
    case "revenue":
      return "border-amber-400/35 bg-amber-500/12 text-amber-100/95";
    case "delivery":
      return "border-sky-400/35 bg-sky-500/12 text-sky-100/95";
    case "growth":
      return "border-violet-400/35 bg-violet-500/12 text-violet-100/95";
    case "health":
      return "border-emerald-400/35 bg-emerald-500/12 text-emerald-100/95";
    case "learning":
      return "border-cyan-400/35 bg-cyan-500/12 text-cyan-100/95";
    case "relationships":
      return "border-fuchsia-400/35 bg-fuchsia-500/12 text-fuchsia-100/95";
    default:
      return "border-white/[0.1] bg-white/[0.04] text-muted-foreground";
  }
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

function GoalCard({
  goal,
  onOpen,
  onProgressChange,
}: {
  goal: Goal;
  onOpen: () => void;
  onProgressChange: (value: number) => void;
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
              areaBadgeClass(goal.area),
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
}: {
  horizon: GoalHorizon;
  title: string;
  hint: string;
  goals: Goal[];
  onOpenGoal: (id: string) => void;
  onProgressChange: (id: string, value: number) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">
            {horizon === "short_term" ? "Near horizon" : "North stars"}
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
          Nothing here yet — add one outcome you&apos;ll defend in a weekly
          review.
        </div>
      ) : (
        <ul className="flex list-none flex-col gap-4 p-0">
          {goals.map((g) => (
            <li key={g.id}>
              <GoalCard
                goal={g}
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
  const { goals, updateGoal } = useGoals();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedGoal = useMemo(
    () =>
      selectedId ? (goals.find((g) => g.id === selectedId) ?? null) : null,
    [goals, selectedId],
  );

  const shortTerm = useMemo(
    () => goalsForHorizon(goals, "short_term"),
    [goals],
  );
  const longTerm = useMemo(() => goalsForHorizon(goals, "long_term"), [goals]);

  return (
    <CrmPage
      title="Goals"
      subtitle="Short horizons for execution discipline · long horizons for ambition. Borrowed from OKRs and exec operating rhythms — tuned for solo operators."
    >
      <div className="dashboard-focus space-y-8 sm:space-y-10">
        <section
          className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_58%,transparent)] px-5 py-6 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] backdrop-blur-xl sm:px-8 sm:py-7"
          aria-labelledby="goals-framework-heading"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="bg-primary/12 text-primary mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-primary/22">
                <Crosshair className="size-5" aria-hidden />
              </span>
              <div className="space-y-2">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Operating cadence
                </p>
                <h2
                  id="goals-framework-heading"
                  className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  What high performers actually track
                </h2>
                <ul className="text-muted-foreground max-w-2xl list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                  <li>
                    <strong className="text-foreground font-medium">
                      Short-term
                    </strong>{" "}
                    — committed outcomes for roughly{" "}
                    <strong className="text-foreground font-medium">
                      30–90 days
                    </strong>
                    ; review weekly and trim mercilessly.
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      Long-term
                    </strong>{" "}
                    — annual or multi-quarter{" "}
                    <strong className="text-foreground font-medium">
                      directional bets
                    </strong>
                    ; refresh quarterly so they stay honest.
                  </li>
                  <li>
                    Each goal gets a{" "}
                    <strong className="text-foreground font-medium">
                      measurable signal
                    </strong>
                    , optional target date, and{" "}
                    <strong className="text-foreground font-medium">
                      0–100 progress
                    </strong>{" "}
                    so momentum isn&apos;t vibes-only.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <GoalsCharts goals={goals} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <GoalsColumn
            horizon="short_term"
            title="Short-term outcomes"
            hint="Next ~30–90 days: sign-offs shipped, pipelines moved, launches landed. Fewer goals beats heroic multitasking."
            goals={shortTerm}
            onOpenGoal={setSelectedId}
            onProgressChange={(id, value) =>
              updateGoal(id, { progress: value })
            }
          />
          <GoalsColumn
            horizon="long_term"
            title="Long-term trajectory"
            hint="Annual / strategic: revenue posture, leverage (people & systems), craft mastery, durability."
            goals={longTerm}
            onOpenGoal={setSelectedId}
            onProgressChange={(id, value) =>
              updateGoal(id, { progress: value })
            }
          />
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
