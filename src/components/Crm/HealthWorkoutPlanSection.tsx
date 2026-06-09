"use client";

import {
  Activity,
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  Mountain,
  Music2,
  RotateCcw,
  Sparkles,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import {
  ALL_WORKOUT_IDS,
  MONTH_NAMES,
  WEEKDAY_LABELS,
  addDays,
  countInRange,
  getDayEntries,
  localDateKey,
  monthMatrix,
  startOfWeekMonday,
  weekDaysFrom,
  workoutTypeMeta,
  WORKOUT_TYPES,
  type WorkoutDayEntry,
  type WorkoutTypeId,
} from "@/lib/crm/workout-plan";
import { cn } from "@/lib/utils";

import { useHealth } from "./HealthContext";

const WORKOUT_ICONS: Record<
  WorkoutTypeId,
  ComponentType<{ className?: string }>
> = {
  gym: Dumbbell,
  run: Footprints,
  rollerblade: Wind,
  swim: Waves,
  bike: Bike,
  walk: Activity,
  hike: Mountain,
  dance: Music2,
};

function formatRangeLabel(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const y = from.getFullYear() !== to.getFullYear();
  const f = from.toLocaleDateString(undefined, y ? { ...opts, year: "numeric" } : opts);
  const t = to.toLocaleDateString(undefined, y ? { ...opts, year: "numeric" } : opts);
  return `${f} - ${t}`;
}

function WorkoutBadge({
  workoutId,
  done,
  compact,
  onToggleDone,
  onRemove,
}: {
  workoutId: WorkoutTypeId;
  done: boolean;
  compact?: boolean;
  onToggleDone: () => void;
  onRemove: () => void;
}) {
  const meta = workoutTypeMeta(workoutId);
  const Icon = WORKOUT_ICONS[workoutId];

  return (
    <span
      className={cn(
        "group/badge inline-flex max-w-full items-stretch rounded-none border transition-colors",
        done
          ? cn(meta.chip, "opacity-70")
          : meta.chip,
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone();
        }}
        title={`${meta.name}${done ? " · done" : " · mark done"}`}
        className={cn(
          "inline-flex min-w-0 items-center gap-1 transition-colors hover:brightness-110",
          compact ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
          done && "line-through decoration-white/40",
        )}
      >
        <Icon className={cn(compact ? "size-2.5" : "size-3", "shrink-0")} aria-hidden />
        {!compact && (
          <span className="truncate font-semibold tracking-wide">{meta.name}</span>
        )}
        {done && <Check className="size-2.5 shrink-0 opacity-90" aria-hidden />}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title={`Remove ${meta.name} from this day`}
        aria-label={`Remove ${meta.name} from this day`}
        className={cn(
          "inline-flex shrink-0 items-center justify-center border-l border-white/10 text-muted-foreground transition-colors hover:bg-rose-500/20 hover:text-rose-100",
          compact ? "w-4" : "w-5",
        )}
      >
        <X className={cn(compact ? "size-2.5" : "size-3")} aria-hidden />
      </button>
    </span>
  );
}

function DayCell({
  date,
  dateKey,
  entries,
  selectedWorkout,
  isToday,
  isOutsideMonth,
  variant,
  onAssign,
  onToggleDone,
  onRemove,
}: {
  date: Date;
  dateKey: string;
  entries: WorkoutDayEntry[];
  selectedWorkout: WorkoutTypeId;
  isToday: boolean;
  isOutsideMonth?: boolean;
  variant: "week" | "month";
  onAssign: () => void;
  onToggleDone: (workoutId: WorkoutTypeId) => void;
  onRemove: (workoutId: WorkoutTypeId) => void;
}) {
  const planned = entries.length;
  const doneCount = entries.filter((e) => e.done).length;
  const allDone = planned > 0 && doneCount === planned;

  return (
    <button
      type="button"
      onClick={onAssign}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-none border text-left transition-[border-color,background-color] duration-200",
        variant === "week" ? "min-h-[132px] p-3" : "min-h-[88px] p-2",
        isToday
          ? "border-cyan-400/40 bg-cyan-500/[0.06] ring-1 ring-cyan-400/25"
          : "border-white/8 bg-black/20 hover:border-white/14 hover:bg-white/[0.02]",
        isOutsideMonth && "opacity-35",
        allDone && "border-lime-400/30",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_45%)] opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-1">
        <span
          className={cn(
            "font-mono tabular-nums leading-none",
            variant === "week" ? "text-lg font-semibold" : "text-sm font-medium",
            isToday ? "text-cyan-100" : "text-foreground",
          )}
        >
          {date.getDate()}
        </span>
        {planned > 0 && (
          <span className="text-muted-foreground font-mono text-[9px] tabular-nums">
            {doneCount}/{planned}
          </span>
        )}
      </div>

      {variant === "week" && (
        <p className="text-muted-foreground relative mt-1 text-[9px] font-semibold tracking-[0.14em] uppercase">
          {date.toLocaleDateString(undefined, { weekday: "short" })}
        </p>
      )}

      <div
        className={cn(
          "relative mt-auto flex flex-wrap gap-1",
          variant === "week" ? "pt-2" : "pt-1.5",
        )}
      >
        {entries.length === 0 ? (
          <span className="text-muted-foreground/70 text-[9px] tracking-wide uppercase opacity-0 transition-opacity group-hover:opacity-100">
            + {workoutTypeMeta(selectedWorkout).name}
          </span>
        ) : (
          entries.map((e) => (
            <WorkoutBadge
              key={e.workoutId}
              workoutId={e.workoutId}
              done={e.done}
              compact={variant === "month"}
              onToggleDone={() => onToggleDone(e.workoutId)}
              onRemove={() => onRemove(e.workoutId)}
            />
          ))
        )}
      </div>

      {planned > 0 && (
        <div className="bg-white/8 relative mt-2 h-0.5 overflow-hidden rounded-full">
          <div
            className="bg-cyan-400/80 h-full transition-[width] duration-300"
            style={{
              width: `${planned > 0 ? Math.round((doneCount / planned) * 100) : 0}%`,
            }}
          />
        </div>
      )}
    </button>
  );
}

export function HealthWorkoutPlanSection() {
  const {
    workoutPlan,
    toggleWorkoutOnDay,
    toggleWorkoutDone,
    resetWorkoutPlan,
  } = useHealth();

  const todayKey = localDateKey();
  const today = useMemo(() => new Date(), []);

  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutTypeId>("gym");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(today);
    return addDays(base, weekOffset * 7);
  }, [today, weekOffset]);

  const weekDays = useMemo(() => weekDaysFrom(weekStart), [weekStart]);
  const weekEnd = weekDays[6]!;

  const monthAnchor = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const monthWeeks = useMemo(
    () => monthMatrix(monthAnchor.getFullYear(), monthAnchor.getMonth()),
    [monthAnchor],
  );

  const weekStats = useMemo(() => {
    const from = localDateKey(weekDays[0]!);
    const to = localDateKey(weekDays[6]!);
    return countInRange(workoutPlan, from, to);
  }, [workoutPlan, weekDays]);

  const monthStats = useMemo(() => {
    const y = monthAnchor.getFullYear();
    const m = monthAnchor.getMonth();
    const from = localDateKey(new Date(y, m, 1));
    const to = localDateKey(new Date(y, m + 1, 0));
    return countInRange(workoutPlan, from, to);
  }, [workoutPlan, monthAnchor]);

  return (
    <section
      className="overflow-hidden rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_76%,transparent)] backdrop-blur-md"
      aria-labelledby="health-workout-plan-heading"
    >
      <header className="border-b border-white/6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-cyan-200/90 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
              <Zap className="size-3.5" aria-hidden />
              Workout plan
            </div>
            <h2
              id="health-workout-plan-heading"
              className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Weekly rhythm · monthly map
            </h2>
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              Pick a movement, tap a day to schedule it. Tap a badge to mark
              done, or use × to remove a mistake. Tap the day again with the
              same brush selected to toggle it off.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatChip label="This week" done={weekStats.done} total={weekStats.planned} />
            <StatChip label="This month" done={monthStats.done} total={monthStats.planned} />
            <button
              type="button"
              onClick={resetWorkoutPlan}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-none border border-white/8 px-3 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors hover:bg-white/3"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Clear plan
            </button>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase">
            <Sparkles className="size-3.5 text-cyan-400/80" aria-hidden />
            Active brush
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {WORKOUT_TYPES.map((w) => {
              const Icon = WORKOUT_ICONS[w.id];
              const active = selectedWorkout === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWorkout(w.id)}
                  className={cn(
                    "relative flex shrink-0 flex-col overflow-hidden rounded-none border px-3 py-2.5 transition-[border-color,transform] duration-200 min-w-[92px]",
                    active
                      ? cn(w.chip, "border-white/20 scale-[1.02] shadow-[0_0_24px_-8px_rgba(34,211,238,0.45)]")
                      : "border-white/8 bg-black/25 text-muted-foreground hover:border-white/14 hover:text-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                      w.accent,
                    )}
                    aria-hidden
                  />
                  <span className="relative flex items-center gap-1.5">
                    <Icon className="size-3.5" aria-hidden />
                    <span className="text-[11px] font-semibold tracking-tight">
                      {w.name}
                    </span>
                  </span>
                  <span className="text-muted-foreground relative mt-0.5 text-[9px]">
                    {w.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-white/6">
        {/* Weekly */}
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-200/90 uppercase">
                Week view
              </p>
              <p className="text-foreground mt-0.5 text-sm font-medium">
                {formatRangeLabel(weekDays[0]!, weekEnd)}
              </p>
            </div>
            <NavButtons
              onPrev={() => setWeekOffset((o) => o - 1)}
              onNext={() => setWeekOffset((o) => o + 1)}
              onToday={() => setWeekOffset(0)}
            />
          </div>

          <div className="mb-2 hidden grid-cols-7 gap-2 sm:grid">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-muted-foreground text-center font-mono text-[9px] font-semibold tracking-[0.2em] uppercase"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
            {weekDays.map((date) => {
              const dateKey = localDateKey(date);
              return (
                <DayCell
                  key={dateKey}
                  date={date}
                  dateKey={dateKey}
                  entries={getDayEntries(workoutPlan, dateKey)}
                  selectedWorkout={selectedWorkout}
                  isToday={dateKey === todayKey}
                  variant="week"
                  onAssign={() => toggleWorkoutOnDay(dateKey, selectedWorkout)}
                  onToggleDone={(id) => toggleWorkoutDone(dateKey, id)}
                  onRemove={(id) => toggleWorkoutOnDay(dateKey, id)}
                />
              );
            })}
          </div>
        </div>

        {/* Monthly */}
        <div className="border-t border-white/6 p-5 sm:p-6 lg:border-t-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-200/90 uppercase">
                Month view
              </p>
              <p className="text-foreground mt-0.5 text-sm font-medium">
                {MONTH_NAMES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
              </p>
            </div>
            <NavButtons
              onPrev={() => setMonthOffset((o) => o - 1)}
              onNext={() => setMonthOffset((o) => o + 1)}
              onToday={() => setMonthOffset(0)}
            />
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={`m-${label}`}
                className="text-muted-foreground text-center font-mono text-[8px] font-semibold tracking-[0.18em] uppercase"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {monthWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((date, di) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${wi}-${di}`}
                        className="min-h-[88px] rounded-none border border-transparent bg-transparent"
                        aria-hidden
                      />
                    );
                  }
                  const dateKey = localDateKey(date);
                  const outside =
                    date.getMonth() !== monthAnchor.getMonth();
                  return (
                    <DayCell
                      key={dateKey}
                      date={date}
                      dateKey={dateKey}
                      entries={getDayEntries(workoutPlan, dateKey)}
                      selectedWorkout={selectedWorkout}
                      isToday={dateKey === todayKey}
                      isOutsideMonth={outside}
                      variant="month"
                      onAssign={() =>
                        toggleWorkoutOnDay(dateKey, selectedWorkout)
                      }
                      onToggleDone={(id) => toggleWorkoutDone(dateKey, id)}
                      onRemove={(id) => toggleWorkoutOnDay(dateKey, id)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-white/6 pt-4">
            {ALL_WORKOUT_IDS.map((id) => {
              const meta = workoutTypeMeta(id);
              return (
                <span
                  key={id}
                  className="text-muted-foreground inline-flex items-center gap-1.5 text-[9px] tracking-wide uppercase"
                >
                  <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
                  {meta.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatChip({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="border-white/8 min-w-[120px] rounded-none border bg-black/25 px-4 py-3">
      <p className="text-muted-foreground text-[9px] font-semibold tracking-[0.16em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-lg font-semibold tabular-nums">
        {done}
        <span className="text-muted-foreground text-sm font-normal">/{total}</span>
      </p>
      <div className="bg-white/8 mt-2 h-1 overflow-hidden rounded-full">
        <div
          className="bg-cyan-400/80 h-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function NavButtons({
  onPrev,
  onNext,
  onToday,
}: {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-none border border-white/8 transition-colors hover:bg-white/3"
        aria-label="Previous"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onToday}
        className="text-muted-foreground hover:text-foreground rounded-none border border-white/8 px-2 py-1 text-[9px] font-semibold tracking-wide uppercase transition-colors hover:bg-white/3"
      >
        Today
      </button>
      <button
        type="button"
        onClick={onNext}
        className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-none border border-white/8 transition-colors hover:bg-white/3"
        aria-label="Next"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
