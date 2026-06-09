"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  HeartPulse,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent } from "react";

import { buttonVariants } from "@/components/Ui/Button";
import {
  HEALTH_PILLARS,
  healthPillarMeta,
  type HealthAction,
  type HealthGoal,
  type HealthPillar,
  type HealthPriority,
} from "@/lib/crm/health";
import { cn } from "@/lib/utils";

import { defaultDueIso } from "./TaskFormShared";
import { useHealth } from "./HealthContext";
import { HealthDietPlanSection } from "./HealthDietPlanSection";
import { HealthWorkoutPlanSection } from "./HealthWorkoutPlanSection";
import { useTasks } from "./TasksContext";

function formatDueLabel(iso: string | null): string {
  if (!iso) return "No date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function priorityDot(p: HealthPriority): string {
  if (p === "high") return "bg-rose-400";
  if (p === "medium") return "bg-amber-400";
  return "bg-slate-500";
}

function HealthOverview({
  activeGoals,
  openActions,
  surgeryGoals,
}: {
  activeGoals: number;
  openActions: number;
  surgeryGoals: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_82%,transparent)] px-4 py-4 backdrop-blur-md">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
          Active goals
        </p>
        <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
          {activeGoals}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Outcomes you are steering toward, not just hoping for.
        </p>
      </div>
      <div className="rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_82%,transparent)] px-4 py-4 backdrop-blur-md">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
          Open actions
        </p>
        <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
          {openActions}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Concrete steps: consults, meals, sessions, rehab.
        </p>
      </div>
      <div className="rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_82%,transparent)] px-4 py-4 backdrop-blur-md">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
          Surgery track
        </p>
        <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
          {surgeryGoals}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Prep and recovery goals on your radar.
        </p>
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onProgress,
  onDelete,
}: {
  goal: HealthGoal;
  onProgress: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_70%,transparent)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold leading-snug">
            {goal.title}
          </p>
          {goal.metric ? (
            <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
              {goal.metric}
            </p>
          ) : null}
          {goal.targetDate ? (
            <p className="text-muted-foreground mt-1 text-[10px] tabular-nums">
              Target {goal.targetDate}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors"
          aria-label={`Remove goal ${goal.title}`}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
      <label className="mt-3 block">
        <span className="text-muted-foreground mb-1 flex justify-between text-[10px] font-medium tabular-nums">
          <span>Progress</span>
          <span>{goal.progress}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={goal.progress}
          onChange={(e) =>
            onProgress(goal.id, Number.parseInt(e.target.value, 10))
          }
          className="accent-primary h-1.5 w-full cursor-pointer"
        />
      </label>
    </article>
  );
}

function ActionRow({
  action,
  onToggle,
  onDelete,
  onPushToTasks,
}: {
  action: HealthAction;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPushToTasks: (action: HealthAction) => void;
}) {
  return (
    <li className="flex items-start gap-2 rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_62%,transparent)] px-2 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={action.done}
        onClick={() => onToggle(action.id)}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-none border transition-colors",
          action.done
            ? "border-primary/45 bg-primary/15 text-primary"
            : "border-white/12 bg-white/[0.04] hover:border-primary/35",
        )}
      >
        <Check
          className={cn(
            "size-3 stroke-[2.5]",
            action.done ? "opacity-100" : "opacity-25",
          )}
          aria-hidden
        />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            action.done && "text-muted-foreground line-through decoration-white/25",
          )}
        >
          {action.title}
        </p>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] tabular-nums">
          <span
            className={cn("inline-block size-1.5 rounded-full", priorityDot(action.priority))}
            aria-hidden
          />
          {formatDueLabel(action.dueAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        {!action.done ? (
          <button
            type="button"
            onClick={() => onPushToTasks(action)}
            className="text-primary hover:text-primary/85 text-[9px] font-semibold tracking-wide uppercase underline-offset-2 hover:underline"
          >
            To tasks
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(action.id)}
          className="text-muted-foreground hover:text-destructive text-[9px] font-semibold tracking-wide uppercase"
          aria-label={`Remove ${action.title}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function HealthPillarPanel({ pillar }: { pillar: HealthPillar }) {
  const meta = healthPillarMeta(pillar);
  const {
    goals,
    actions,
    addGoal,
    addAction,
    updateGoal,
    toggleAction,
    deleteGoal,
    deleteAction,
  } = useHealth();
  const { addTask } = useTasks();

  const [goalTitle, setGoalTitle] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [mode, setMode] = useState<"goal" | "action">("action");

  const pillarGoals = useMemo(
    () =>
      goals.filter((g) => g.pillar === pillar && g.status === "active"),
    [goals, pillar],
  );
  const pillarActions = useMemo(
    () =>
      actions
        .filter((a) => a.pillar === pillar)
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return ad - bd;
        }),
    [actions, pillar],
  );

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const title = (mode === "goal" ? goalTitle : actionTitle).trim();
      if (!title) return;
      if (mode === "goal") {
        addGoal({ pillar, title });
        setGoalTitle("");
      } else {
        addAction({
          pillar,
          title,
          dueAt: defaultDueIso(),
          priority: pillar === "surgery" ? "high" : "medium",
        });
        setActionTitle("");
      }
    },
    [actionTitle, addAction, addGoal, goalTitle, mode, pillar],
  );

  const pushToTasks = useCallback(
    (action: HealthAction) => {
      addTask({
        title: `[Health] ${action.title}`,
        relatedKind: "none",
        relatedId: null,
        dueAt: action.dueAt ?? defaultDueIso(),
        priority: action.priority,
        assignee: "You",
      });
    },
    [addTask],
  );

  return (
    <section className="flex flex-col gap-4 rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_78%,transparent)] p-4 backdrop-blur-md sm:p-5">
      <header className="space-y-2">
        <span
          className={cn(
            "inline-flex rounded-none border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            meta.accent,
          )}
        >
          {meta.label}
        </span>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {meta.hint}
        </p>
      </header>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="text-muted-foreground size-3.5" aria-hidden />
          <h3 className="text-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Goals ({pillarGoals.length})
          </h3>
        </div>
        {pillarGoals.length === 0 ? (
          <p className="text-muted-foreground border border-dashed border-white/8 px-3 py-3 text-center text-xs">
            e.g. fix diet baseline, prep for surgery, rebuild cardio
          </p>
        ) : (
          <div className="grid gap-2">
            {pillarGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onProgress={(id, progress) => updateGoal(id, { progress })}
                onDelete={deleteGoal}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="text-muted-foreground size-3.5" aria-hidden />
          <h3 className="text-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Actions ({pillarActions.filter((a) => !a.done).length} open)
          </h3>
        </div>
        {pillarActions.length === 0 ? (
          <p className="text-muted-foreground border border-dashed border-white/8 px-3 py-3 text-center text-xs">
            e.g. book consult, meal prep block, physio session
          </p>
        ) : (
          <ul className="grid list-none gap-1.5 p-0">
            {pillarActions.map((a) => (
              <ActionRow
                key={a.id}
                action={a}
                onToggle={toggleAction}
                onDelete={deleteAction}
                onPushToTasks={pushToTasks}
              />
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="mt-auto space-y-2">
        <div className="flex gap-1 text-[10px] font-semibold tracking-wide uppercase">
          <button
            type="button"
            onClick={() => setMode("action")}
            className={cn(
              "rounded-none px-2 py-1 transition-colors",
              mode === "action"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Action
          </button>
          <button
            type="button"
            onClick={() => setMode("goal")}
            className={cn(
              "rounded-none px-2 py-1 transition-colors",
              mode === "goal"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Goal
          </button>
        </div>
        <div className="flex h-9 overflow-hidden rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_70%,transparent)]">
          <input
            type="text"
            value={mode === "goal" ? goalTitle : actionTitle}
            onChange={(e) =>
              mode === "goal"
                ? setGoalTitle(e.target.value)
                : setActionTitle(e.target.value)
            }
            placeholder={
              mode === "goal" ? "New outcome…" : "Next step…"
            }
            className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent px-3 text-[12px] outline-none"
          />
          <button
            type="submit"
            className="text-foreground hover:text-primary flex w-9 shrink-0 items-center justify-center border-l border-white/6 transition-colors hover:bg-white/[0.04]"
            aria-label={mode === "goal" ? "Add goal" : "Add action"}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}

export function HealthPageClient() {
  const { goals, actions } = useHealth();

  const activeGoals = goals.filter((g) => g.status === "active").length;
  const openActions = actions.filter((a) => !a.done).length;
  const surgeryGoals = goals.filter(
    (g) => g.pillar === "surgery" && g.status === "active",
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/12 text-emerald-200 inline-flex size-11 items-center justify-center rounded-none ring-1 ring-emerald-400/25">
            <HeartPulse className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Body & recovery
            </p>
            <p className="text-foreground text-base font-semibold tracking-tight">
              Goals set direction. Actions move the needle.
            </p>
          </div>
        </div>
        <Link
          href="/today"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "gap-1.5",
          )}
        >
          Today timeline
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <HealthOverview
        activeGoals={activeGoals}
        openActions={openActions}
        surgeryGoals={surgeryGoals}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {HEALTH_PILLARS.map((p) => (
          <HealthPillarPanel key={p.id} pillar={p.id} />
        ))}
      </div>

      <HealthWorkoutPlanSection />

      <HealthDietPlanSection />
    </div>
  );
}
