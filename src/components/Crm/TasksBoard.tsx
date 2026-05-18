"use client";

import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Task, TaskPriority } from "@/lib/crm/types";
import { formatTaskRelatedLine } from "@/lib/crm/task-related-label";
import { cn } from "@/lib/utils";

import { AddTaskSheet } from "./AddTaskSheet";
import { useCompanies } from "./CompaniesContext";
import { useContacts } from "./ContactsContext";
import { useDeals } from "./DealsContext";
import { useLeads } from "./LeadsContext";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { useTasks } from "./TasksContext";

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isDueToday(iso: string) {
  const due = new Date(iso).getTime();
  return startOfDay(due) === startOfDay(Date.now());
}

function isOverdue(iso: string, done: boolean) {
  if (done) return false;
  return new Date(iso).getTime() < Date.now();
}

function priorityAccent(priority: TaskPriority): string {
  if (priority === "high") {
    return "from-rose-400/[0.16] via-transparent to-transparent";
  }
  if (priority === "medium") {
    return "from-amber-400/[0.13] via-transparent to-transparent";
  }
  return "from-sky-400/[0.10] via-transparent to-transparent";
}

function priorityLabel(priority: TaskPriority) {
  if (priority === "high") return "Peak";
  if (priority === "medium") return "Steady";
  return "Easy";
}

function MomentumOrbit({ value }: { value: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = c * (1 - pct / 100);

  return (
    <div
      className="text-primary relative size-[42px] shrink-0"
      role="img"
      aria-label={`Momentum ${pct}%`}
    >
      <svg className="-rotate-90 size-full" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          className="stroke-white/[0.06]"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-foreground">
        {pct}
      </span>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onOpen,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onOpen: () => void;
}) {
  const overdue = isOverdue(task.dueAt, task.done);
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

  return (
    <article className="group relative rounded-none">
      <div
        className={cn(
          "relative z-[1] cursor-pointer overflow-hidden rounded-none border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] p-4 backdrop-blur-md outline-none",
          "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] transition-[border-color,transform] duration-300 ease-out",
          "group-hover:border-white/[0.11]",
          "translate-y-0 group-hover:-translate-y-px",
          "focus-visible:ring-primary focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          task.done && "opacity-[0.72]",
          overdue && !task.done && "border-rose-400/25",
        )}
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
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.55]",
            priorityAccent(task.priority),
          )}
        />
        <div className="relative flex gap-3">
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
              "group/check mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-none border transition-all duration-300",
              task.done
                ? "border-primary/50 bg-primary/[0.18] text-primary"
                : "border-white/[0.12] bg-white/[0.03] hover:border-primary/35 hover:bg-primary/[0.08]",
            )}
          >
            <Check
              className={cn(
                "size-4 stroke-[2.5] transition-opacity duration-200",
                task.done
                  ? "text-primary"
                  : "text-muted-foreground/30 group-hover/check:text-muted-foreground/70",
              )}
              aria-hidden
            />
          </button>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
                {priorityLabel(task.priority)}
              </span>
              {overdue && !task.done ? (
                <span className="text-[10px] font-semibold tracking-wide text-rose-400/90 uppercase">
                  Overdue
                </span>
              ) : null}
              {task.done ? (
                <span className="text-primary text-[10px] font-semibold tracking-[0.14em] uppercase">
                  Logged
                </span>
              ) : null}
            </div>
            <h3
              className={cn(
                "text-[13px] leading-snug font-semibold tracking-tight text-foreground",
                task.done && "text-muted-foreground line-through decoration-white/25",
              )}
            >
              {task.title}
            </h3>
            <p className="text-muted-foreground truncate text-[11px] font-medium tracking-wide uppercase">
              {relatedLine}
            </p>
          </div>

          <div className="hidden shrink-0 flex-col items-end gap-1 text-right text-[11px] tabular-nums sm:flex">
            <span className="text-muted-foreground/80 group-hover:text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Open
            </span>
            <time className="font-medium text-foreground">
              {new Intl.DateTimeFormat("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(task.dueAt))}
            </time>
            <span className="max-w-[9rem] truncate text-muted-foreground">
              {task.assignee}
            </span>
          </div>
        </div>

        <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px] text-muted-foreground sm:hidden">
          <span className="truncate pr-2">{task.assignee}</span>
          <time className="shrink-0 tabular-nums">
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(task.dueAt))}
          </time>
        </div>
      </div>
    </article>
  );
}

function EmptyLane({ label }: { label: string }) {
  return (
    <div className="border-sidebar-border text-muted-foreground/70 flex min-h-[100px] flex-col items-center justify-center rounded-none border border-dashed border-white/[0.07] bg-white/[0.02] px-4 py-10 text-center text-[11px] leading-relaxed tracking-wide">
      <span className="mb-2 inline-flex size-8 items-center justify-center rounded-none border border-white/[0.06] text-lg font-light">
        ○
      </span>
      {label}
    </div>
  );
}

export function TasksBoard() {
  const { tasks, toggleTask } = useTasks();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const { doneTasks, todayTasks, aheadTasks, stats } = useMemo(() => {
    const sortedOpen = [...tasks]
      .filter((t) => !t.done)
      .sort(
        (a, b) =>
          new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      );
    const sortedDone = [...tasks]
      .filter((t) => t.done)
      .sort(
        (a, b) =>
          new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime(),
      );

    const today = sortedOpen.filter((t) => isDueToday(t.dueAt));
    const ahead = sortedOpen.filter((t) => !isDueToday(t.dueAt));

    const total = tasks.length || 1;
    const momentum = Math.round((sortedDone.length / total) * 100);

    let nextLabel = "-";
    if (sortedOpen[0]) {
      nextLabel = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(sortedOpen[0].dueAt));
    }

    return {
      doneTasks: sortedDone,
      todayTasks: today,
      aheadTasks: ahead,
      stats: {
        open: sortedOpen.length,
        momentum,
        nextLabel,
        wins: sortedDone.length,
      },
    };
  }, [tasks]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground/90 max-w-2xl text-center text-[13px] font-medium leading-relaxed tracking-tight md:text-left">
          One calm lane at a time. Tick the small wins, momentum compounds.
        </p>
        <AddTaskSheet />
      </div>

      <div className="border-sidebar-border grid gap-6 border-b border-white/[0.05] pb-8 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
            Open focus
          </p>
          <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {stats.open}
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              active
            </span>
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
            Momentum
          </p>
          <div className="mt-1 flex items-center gap-3">
            <MomentumOrbit value={stats.momentum} />
            <p className="text-muted-foreground text-[11px] leading-snug tracking-wide">
              Closed tasks fuel momentum; keep closing loops.
            </p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
            Next move
          </p>
          <p className="text-primary mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {stats.nextLabel}
          </p>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="pointer-events-none absolute top-[14px] right-10 left-10 z-0 h-px bg-white/[0.08] md:left-16 md:right-16"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto flex max-w-3xl items-start justify-between gap-4 px-2">
          {[
            { label: "Today", hot: todayTasks.length > 0, hint: "Now" },
            { label: "Ahead", hot: aheadTasks.length > 0, hint: "Queue" },
            {
              label: "Wins",
              hot: doneTasks.length > 0,
              hint: "Logged",
            },
          ].map((node, i) => (
            <div
              key={node.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
            >
              <div
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums transition-all duration-500 sm:size-10 sm:text-[11px]",
                  node.hot
                    ? "border-primary/45 bg-primary/[0.14] text-primary"
                    : "border-white/[0.08] bg-background/60 text-muted-foreground",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 px-0.5">
                <p className="text-foreground text-[10px] font-semibold tracking-[0.14em] uppercase sm:text-[11px]">
                  {node.label}
                </p>
                <p className="text-muted-foreground mt-0.5 hidden text-[10px] tracking-wide sm:block">
                  {node.hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
        <div className="space-y-10">
          <section className="space-y-4">
            <header className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-foreground text-sm font-semibold tracking-tight">
                  Today
                </h2>
                <p className="text-muted-foreground mt-0.5 text-[11px] tracking-wide">
                  Ship what&apos;s due, clarity beats volume.
                </p>
              </div>
              <span className="text-muted-foreground text-[11px] tabular-nums">
                {todayTasks.length}{" "}
                {todayTasks.length === 1 ? "task" : "tasks"}
              </span>
            </header>
            <div className="flex flex-col gap-3">
              {todayTasks.length === 0 ? (
                <EmptyLane label="Nothing due today, grab something ahead or celebrate the quiet." />
              ) : (
                todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
                  >
                    <TaskCard
                      task={task}
                      onToggle={toggleTask}
                      onOpen={() => setSelectedId(task.id)}
                    />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4">
            <header className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-foreground text-sm font-semibold tracking-tight">
                  Ahead
                </h2>
                <p className="text-muted-foreground mt-0.5 text-[11px] tracking-wide">
                  Queue with intention, protect deep work.
                </p>
              </div>
              <span className="text-muted-foreground text-[11px] tabular-nums">
                {aheadTasks.length}{" "}
                {aheadTasks.length === 1 ? "task" : "tasks"}
              </span>
            </header>
            <div className="flex flex-col gap-3">
              {aheadTasks.length === 0 ? (
                <EmptyLane label="Your runway is clear, add the next meaningful touch." />
              ) : (
                aheadTasks.map((task) => (
                  <div
                    key={task.id}
                    className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
                  >
                    <TaskCard
                      task={task}
                      onToggle={toggleTask}
                      onOpen={() => setSelectedId(task.id)}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div
            className={cn(
              "overflow-hidden rounded-none border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_82%,transparent)] p-5 backdrop-blur-md",
              "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]",
            )}
          >
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Wins bank
            </p>
            <p className="text-foreground mt-2 text-lg font-semibold tracking-tight">
              {stats.wins}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                closed
              </span>
            </p>
            <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed tracking-wide">
              Every check-in is proof you&apos;re moving revenue reality, not
              just lists.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-muted-foreground px-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
              Recent logged
            </h3>
            {doneTasks.length === 0 ? (
              <EmptyLane label="Finish one task, your first win shows up here." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {doneTasks.map((task) => (
                  <div key={task.id} className="scale-[0.98] origin-top">
                    <TaskCard
                      task={task}
                      onToggle={toggleTask}
                      onOpen={() => setSelectedId(task.id)}
                    />
                  </div>
                ))}
              </div>
            )}
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

      <p className="text-muted-foreground/80 pt-2 text-center text-[10px] tracking-[0.12em] uppercase">
        Focus · finish · forward
      </p>
    </div>
  );
}
