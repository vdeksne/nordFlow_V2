"use client";

import Link from "next/link";
import { Check, Clock3, Focus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Task, TaskPriority } from "@/lib/crm/types";
import { formatTaskRelatedLine } from "@/lib/crm/task-related-label";
import { cn } from "@/lib/utils";

import { AddTaskSheet } from "./AddTaskSheet";
import { useCompanies } from "./CompaniesContext";
import { useContacts } from "./ContactsContext";
import { useDeals } from "./DealsContext";
import { useLeads } from "./LeadsContext";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { TASK_PRIORITY_OPTIONS } from "./TaskFormShared";
import { useTasks } from "./TasksContext";

const DAY_START_HOUR = 7;
/** Last row shows this hour → next hour (e.g. 19 → 20:00). */
const DAY_END_HOUR = 19;
const ROW_HEIGHT_PX = 56;
const BLOCK_MIN_HEIGHT = 40;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isDueToday(iso: string) {
  return startOfDay(new Date(iso).getTime()) === startOfDay(Date.now());
}

function isOverdue(iso: string, done: boolean) {
  if (done) return false;
  return new Date(iso).getTime() < Date.now();
}

function priorityAccent(priority: TaskPriority): string {
  if (priority === "high") {
    return "from-rose-400/[0.18] via-transparent to-transparent";
  }
  if (priority === "medium") {
    return "from-amber-400/[0.14] via-transparent to-transparent";
  }
  return "from-sky-400/[0.11] via-transparent to-transparent";
}

function priorityLabel(priority: TaskPriority) {
  if (priority === "high") return "Peak";
  if (priority === "medium") return "Steady";
  return "Easy";
}

function hourBucketIndex(iso: string): number {
  const d = new Date(iso);
  const h = d.getHours();
  const idx = h - DAY_START_HOUR;
  const span = DAY_END_HOUR - DAY_START_HOUR + 1;
  return Math.min(Math.max(idx, 0), span - 1);
}

function formatShortTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function defaultQuickHour(): number {
  const n = new Date();
  let h = n.getHours();
  const m = n.getMinutes();
  if (m > 5) h += 1;
  return Math.min(Math.max(h, DAY_START_HOUR), DAY_END_HOUR);
}

function isoTodayAtHourMinute(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function useNowMinute() {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return tick;
}

function TimetableTaskBlock({
  task,
  onToggle,
  onOpen,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onOpen: () => void;
}) {
  const { deals } = useDeals();
  const { companies } = useCompanies();
  const { leads } = useLeads();
  const { contacts } = useContacts();
  const relatedLine = useMemo(
    () =>
      formatTaskRelatedLine(task, {
        deals,
        companies,
        leads,
        contacts,
      }),
    [task, deals, companies, leads, contacts],
  );

  const overdue = isOverdue(task.dueAt, task.done);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${task.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "relative flex min-h-[38px] cursor-pointer gap-2 rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_90%,transparent)] p-2.5 text-left backdrop-blur-sm transition-colors hover:border-white/[0.14]",
        task.done && "opacity-[0.65]",
        overdue && !task.done && "border-rose-400/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.45]",
          priorityAccent(task.priority),
        )}
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? "Mark as open" : "Mark as done"}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        className={cn(
          "relative z-[1] mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-none border transition-colors",
          task.done
            ? "border-primary/45 bg-primary/[0.15] text-primary"
            : "border-white/[0.12] bg-white/[0.04] hover:border-primary/35",
        )}
      >
        <Check
          className={cn(
            "size-3.5 stroke-[2.5]",
            task.done ? "opacity-100" : "opacity-25",
          )}
          aria-hidden
        />
      </button>
      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-[9px] font-semibold tracking-[0.14em] uppercase">
            {priorityLabel(task.priority)}
          </span>
          <span className="text-foreground/85 flex items-center gap-1 text-[10px] font-medium tabular-nums">
            <Clock3 className="size-3 opacity-70" aria-hidden />
            {formatShortTime(task.dueAt)}
          </span>
        </div>
        <p
          className={cn(
            "mt-0.5 text-[12px] leading-snug font-semibold tracking-tight",
            task.done && "text-muted-foreground line-through decoration-white/25",
          )}
        >
          {task.title}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-[10px] tracking-wide uppercase">
          {relatedLine}
        </p>
      </div>
    </div>
  );
}

export function TodayPageClient() {
  const { tasks, addTask, toggleTask } = useTasks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nowTs = useNowMinute();

  const [quickTitle, setQuickTitle] = useState("");
  const [quickHour, setQuickHour] = useState(defaultQuickHour);
  const [quickMinute, setQuickMinute] = useState(0);
  const [quickPriority, setQuickPriority] =
    useState<TaskPriority>("medium");
  const [quickError, setQuickError] = useState<string | null>(null);

  const selectedTask = useMemo(
    () =>
      selectedId ? (tasks.find((t) => t.id === selectedId) ?? null) : null,
    [tasks, selectedId],
  );

  useEffect(() => {
    if (selectedId !== null && !tasks.some((t) => t.id === selectedId)) {
      queueMicrotask(() => setSelectedId(null));
    }
  }, [tasks, selectedId]);

  const {
    overdueOpen,
    mitCandidates,
    overviewStats,
    tasksByHour,
    hourLabels,
  } = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const doneToday = tasks.filter(
      (t) => t.done && isDueToday(t.dueAt),
    );

    const overdue = open.filter((t) => isOverdue(t.dueAt, false));
    const dueToday = open.filter((t) => isDueToday(t.dueAt));

    const sortedMit = [...dueToday].sort((a, b) => {
      const pr: Record<TaskPriority, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      const p = pr[a.priority] - pr[b.priority];
      if (p !== 0) return p;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    const mit = sortedMit.slice(0, 3);

    const byHour = new Map<number, Task[]>();
    const span = DAY_END_HOUR - DAY_START_HOUR + 1;
    for (let i = 0; i < span; i++) {
      byHour.set(i, []);
    }

    for (const t of [...dueToday, ...doneToday]) {
      const idx = hourBucketIndex(t.dueAt);
      byHour.get(idx)!.push(t);
    }

    for (const [, list] of byHour) {
      list.sort(
        (a, b) =>
          new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      );
    }

    const labels = Array.from(
      { length: span },
      (_, i) => DAY_START_HOUR + i,
    );

    return {
      overdueOpen: overdue.sort(
        (a, b) =>
          new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      ),
      mitCandidates: mit,
      overviewStats: {
        overdueN: overdue.length,
        todayOpenN: dueToday.length,
        doneTodayN: doneToday.length,
      },
      tasksByHour: byHour,
      hourLabels: labels,
    };
  }, [tasks]);

  const nowLinePct = useMemo(() => {
    const now = new Date(nowTs);
    const startMins = DAY_START_HOUR * 60;
    const endMins = (DAY_END_HOUR + 1) * 60;
    const cur = now.getHours() * 60 + now.getMinutes();
    if (cur < startMins || cur > endMins) return null;
    const total = endMins - startMins;
    return ((cur - startMins) / total) * 100;
  }, [nowTs]);

  const submitQuickAdd = useCallback(() => {
    const trimmed = quickTitle.trim();
    if (!trimmed) {
      setQuickError("Name the next step - one clear verb helps execution.");
      return;
    }
    try {
      const iso = isoTodayAtHourMinute(quickHour, quickMinute);
      if (Number.isNaN(new Date(iso).getTime())) {
        setQuickError("Pick a valid time.");
        return;
      }
      addTask({
        title: trimmed,
        relatedKind: "none",
        relatedId: null,
        dueAt: iso,
        priority: quickPriority,
        assignee: "You",
      });
      setQuickTitle("");
      setQuickError(null);
      setQuickHour(defaultQuickHour());
      setQuickMinute(0);
    } catch {
      setQuickError("Could not schedule that slot.");
    }
  }, [addTask, quickHour, quickMinute, quickPriority, quickTitle]);

  const gridBodyHeight =
    hourLabels.length * ROW_HEIGHT_PX + BLOCK_MIN_HEIGHT * 0.25;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="border-sidebar-border grid max-w-xl gap-4 border-b border-white/[0.06] pb-6 sm:grid-cols-3 lg:border-0 lg:pb-0">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Carried over
            </p>
            <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
              {overviewStats.overdueN}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                overdue
              </span>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Still open today
            </p>
            <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
              {overviewStats.todayOpenN}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                active
              </span>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Closed today
            </p>
            <p className="text-primary mt-1 text-2xl font-semibold tabular-nums">
              {overviewStats.doneTodayN}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                wins
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Link
            href="/tasks"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide transition-colors"
          >
            Full task board
            <span aria-hidden>→</span>
          </Link>
          <AddTaskSheet />
        </div>
      </div>

      {overdueOpen.length > 0 ? (
        <section
          className="rounded-none border border-rose-400/20 bg-rose-500/[0.06] p-4 backdrop-blur-sm"
          aria-labelledby="catch-up-heading"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="catch-up-heading"
              className="text-[11px] font-semibold tracking-[0.18em] text-rose-200/90 uppercase"
            >
              Catch up first
            </h2>
            <span className="text-muted-foreground text-[11px] leading-snug">
              Triage overdue before you borrow more calendar space - closes
              open loops (GTD).
            </span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {overdueOpen.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className="border-sidebar-border hover:bg-background/80 flex max-w-[220px] items-center gap-2 rounded-none border border-white/[0.08] bg-background/40 px-3 py-2 text-left transition-colors"
                >
                  <span className="text-foreground truncate text-[12px] font-medium">
                    {t.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                    {formatShortTime(t.dueAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
        <section className="space-y-3">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Clock3 className="text-primary size-4" aria-hidden />
                Day timeline
              </h2>
              <p className="text-muted-foreground mt-0.5 max-w-lg text-[11px] leading-relaxed tracking-wide">
                Hour rows are time boxes: group work in 60-90 minute deep
                blocks, leave buffer between commitments.
              </p>
            </div>
          </header>

          <div className="border-sidebar-border overflow-hidden rounded-none border border-white/[0.07] bg-[color-mix(in_oklab,var(--card)_78%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]">
            <div className="flex">
              <div
                className="text-muted-foreground/80 shrink-0 border-r border-white/[0.06] bg-white/[0.02] pt-2 pr-3 pl-2 text-[10px] font-medium tabular-nums"
                style={{ minHeight: gridBodyHeight }}
              >
                {hourLabels.map((h) => (
                  <div
                    key={h}
                    style={{ height: ROW_HEIGHT_PX }}
                    className="flex items-start justify-end pt-1"
                  >
                    {String(h).padStart(2, "0")}
                    :00
                  </div>
                ))}
              </div>

              <div
                className="relative min-h-0 min-w-0 flex-1"
                style={{ height: gridBodyHeight }}
              >
                {hourLabels.map((h, rowIdx) => (
                  <div
                    key={h}
                    className="border-sidebar-border absolute right-0 left-0 border-b border-white/[0.05]"
                    style={{
                      top: rowIdx * ROW_HEIGHT_PX,
                      height: ROW_HEIGHT_PX,
                    }}
                  />
                ))}

                {nowLinePct !== null ? (
                  <div
                    className="pointer-events-none absolute right-2 left-2 z-20 border-t-2 border-dashed border-primary/70"
                    style={{ top: `${nowLinePct}%` }}
                    aria-hidden
                  >
                    <span className="bg-primary text-primary-foreground absolute -top-3 left-0 rounded-none px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                      Now
                    </span>
                  </div>
                ) : null}

                <div className="absolute inset-0 z-10 px-2 pt-1 pb-2">
                  {hourLabels.map((h, rowIdx) => {
                    const blocks = tasksByHour.get(rowIdx) ?? [];
                    return (
                      <div
                        key={h}
                        className="absolute right-2 left-2 flex flex-col gap-1.5"
                        style={{
                          top: rowIdx * ROW_HEIGHT_PX + 4,
                          minHeight: ROW_HEIGHT_PX - 8,
                        }}
                      >
                        {blocks.map((task) => (
                          <TimetableTaskBlock
                            key={task.id}
                            task={task}
                            onToggle={toggleTask}
                            onOpen={() => setSelectedId(task.id)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <div
            className={cn(
              "space-y-4 rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_85%,transparent)] p-5 backdrop-blur-md",
              "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]",
            )}
          >
            <div className="flex items-center gap-2">
              <Focus className="text-primary size-4" aria-hidden />
              <h2 className="text-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                Quick capture
              </h2>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Brain dump → scheduled commitment. Defaults keep friction near
              zero (Zeigarnik effect).
            </p>

            <div className="space-y-3">
              <label className="sr-only" htmlFor="today-quick-title">
                Task title
              </label>
              <input
                id="today-quick-title"
                value={quickTitle}
                onChange={(e) => {
                  setQuickTitle(e.target.value);
                  setQuickError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitQuickAdd();
                  }
                }}
                placeholder="Next concrete step…"
                className="border-sidebar-border bg-background/80 focus-visible:ring-primary h-11 w-full rounded-none border border-white/[0.08] px-3 text-sm outline-none transition-[box-shadow,border-color] focus-visible:ring-2"
              />

              <div className="flex flex-wrap gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                    Start
                  </span>
                  <select
                    value={quickHour}
                    onChange={(e) =>
                      setQuickHour(Number.parseInt(e.target.value, 10))
                    }
                    className="border-sidebar-border bg-background/80 h-10 min-w-[88px] rounded-none border border-white/[0.08] px-2 text-[12px]"
                  >
                    {hourLabels.map((hourVal) => (
                      <option key={hourVal} value={hourVal}>
                        {String(hourVal).padStart(2, "0")}:..
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                    Min
                  </span>
                  <select
                    value={quickMinute}
                    onChange={(e) =>
                      setQuickMinute(Number.parseInt(e.target.value, 10))
                    }
                    className="border-sidebar-border bg-background/80 h-10 min-w-[72px] rounded-none border border-white/[0.08] px-2 text-[12px]"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        :{String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TASK_PRIORITY_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQuickPriority(value)}
                    className={cn(
                      "rounded-none border px-2.5 py-1.5 text-[10px] font-semibold tracking-wide uppercase transition-colors",
                      quickPriority === value
                        ? "border-primary/45 bg-primary/[0.14] text-primary"
                        : "border-white/[0.08] bg-transparent text-muted-foreground hover:border-white/[0.14]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {quickError ? (
                <p className="text-[11px] text-rose-300/95">{quickError}</p>
              ) : null}

              <button
                type="button"
                onClick={submitQuickAdd}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-full rounded-none text-[13px] font-semibold tracking-tight transition-colors"
              >
                Block on calendar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <SparklesGlyph />
              <h3 className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
                Must-do (MIT · top 3)
              </h3>
            </div>
            <p className="text-muted-foreground px-1 text-[11px] leading-relaxed">
              Finish these before expanding scope - protects attention (Eat
              That Frog).
            </p>
            <ul className="flex flex-col gap-2">
              {mitCandidates.length === 0 ? (
                <li className="text-muted-foreground border-sidebar-border rounded-none border border-dashed border-white/[0.07] px-4 py-8 text-center text-[11px]">
                  No open tasks due today. Pull one from Ahead or capture
                  above.
                </li>
              ) : (
                mitCandidates.map((t, i) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className="border-sidebar-border hover:bg-card/90 flex w-full items-start gap-3 rounded-none border border-white/[0.07] bg-[color-mix(in_oklab,var(--card)_75%,transparent)] p-3 text-left transition-colors"
                    >
                      <span className="text-primary mt-0.5 text-xs font-bold tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-[13px] font-semibold">
                          {t.title}
                        </p>
                        <p className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">
                          {priorityLabel(t.priority)} ·{" "}
                          {formatShortTime(t.dueAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </div>

      <TaskDetailSheet
        task={selectedTask}
        open={selectedId !== null && selectedTask !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
      />

      <p className="text-muted-foreground/75 text-center text-[10px] tracking-[0.14em] uppercase">
        Plan · block · execute
      </p>
    </div>
  );
}

function SparklesGlyph() {
  return (
    <span
      className="inline-flex size-5 items-center justify-center rounded-none border border-amber-400/25 bg-amber-400/[0.08] text-[11px]"
      aria-hidden
    >
      ★
    </span>
  );
}
