"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp, Copy, Plus, Target } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { buttonVariants } from "@/components/Ui/Button";
import type { Goal, Task, TaskPriority } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { useGoals } from "./GoalsContext";
import {
  taskOpenSortKey,
  taskTouchesTodayCalendar,
} from "./TaskFormShared";
import { useTasks } from "./TasksContext";

type BucketId = "today" | "week" | "month" | "year";

type TaskBucketId = "today" | "week" | "month";

type PriorityRow =
  | {
      kind: "task";
      id: string;
      taskId: string;
      bucketId: TaskBucketId;
      title: string;
      meta: string;
      accent: TaskPriority;
      rank: number;
    }
  | {
      kind: "goal";
      id: string;
      title: string;
      meta: string;
      href: string;
      rank: number;
    };

const TASK_BUCKETS: TaskBucketId[] = ["today", "week", "month"];

const DASHBOARD_ORDER_KEY = "crm-dashboard-priority-order-v1";

type DashboardTaskOrder = Record<TaskBucketId, string[]>;

const EMPTY_ORDER: DashboardTaskOrder = { today: [], week: [], month: [] };

function loadDashboardOrder(): DashboardTaskOrder {
  if (typeof window === "undefined") return EMPTY_ORDER;
  try {
    const raw = localStorage.getItem(DASHBOARD_ORDER_KEY);
    if (!raw) return EMPTY_ORDER;
    const parsed = JSON.parse(raw) as Partial<DashboardTaskOrder>;
    return {
      today: Array.isArray(parsed.today) ? parsed.today : [],
      week: Array.isArray(parsed.week) ? parsed.week : [],
      month: Array.isArray(parsed.month) ? parsed.month : [],
    };
  } catch {
    return EMPTY_ORDER;
  }
}

function persistDashboardOrder(order: DashboardTaskOrder) {
  localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
}

/** Keep saved order; append new tasks after existing ids (default-sorted). */
function mergeTaskOrder(stored: string[], tasks: Task[]): string[] {
  const ids = new Set(tasks.map((t) => t.id));
  const kept = stored.filter((id) => ids.has(id));
  const known = new Set(kept);
  const newcomers = sortTasks(tasks.filter((t) => !known.has(t.id)));
  return [...kept, ...newcomers.map((t) => t.id)];
}

function applyTaskOrder(tasks: Task[], orderIds: string[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const out: Task[] = [];
  for (const id of orderIds) {
    const t = byId.get(id);
    if (t) {
      out.push(t);
      byId.delete(id);
    }
  }
  out.push(...sortTasks([...byId.values()]));
  return out;
}

function reorderTaskId(
  order: string[],
  taskId: string,
  direction: -1 | 1,
): string[] {
  const i = order.indexOf(taskId);
  if (i < 0) return order;
  const j = i + direction;
  if (j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const TODAY_RANK_LABELS = ["Do first", "Then this", "If time"] as const;

const BUCKET_META: Record<
  BucketId,
  { label: string; hint: string; href: string }
> = {
  today: {
    label: "Today",
    hint: "#1 at the top is your first move today",
    href: "/today",
  },
  week: {
    label: "This week",
    hint: "Before the week ends",
    href: "/tasks",
  },
  month: {
    label: "This month",
    hint: "Tasks and 30–90 day goals",
    href: "/tasks",
  },
  year: {
    label: "This year",
    hint: "Strategic north stars",
    href: "/goals",
  },
};

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday-start week (matches en-GB week boundaries). */
function startOfLocalWeek(ts: number): number {
  const d = new Date(startOfLocalDay(ts));
  const day = d.getDay();
  const daysFromMonday = (day + 6) % 7;
  d.setDate(d.getDate() - daysFromMonday);
  return d.getTime();
}

function endExclusiveLocalWeek(ts: number): number {
  const d = new Date(startOfLocalWeek(ts));
  d.setDate(d.getDate() + 7);
  return d.getTime();
}

function endExclusiveLocalMonth(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 1, 1);
  return d.getTime();
}

/** Default due time when quick-adding a task from a dashboard bucket. */
function defaultDueForTaskBucket(
  bucket: "today" | "week" | "month",
  now: number,
): string {
  const n = new Date(now);

  if (bucket === "today") {
    let h = n.getHours();
    if (n.getMinutes() > 5) h += 1;
    if (h < 9) h = 9;
    n.setMinutes(0, 0, 0);
    n.setHours(Math.min(h, 20));
    if (n.getTime() <= now) {
      n.setHours(Math.min(h + 1, 23), 0, 0, 0);
    }
    return n.toISOString();
  }

  if (bucket === "week") {
    const tomorrow = startOfLocalDay(now) + 86_400_000;
    const weekEnd = endExclusiveLocalWeek(now);
    const pick = new Date(Math.max(tomorrow, now + 86_400_000));
    pick.setHours(9, 0, 0, 0);
    if (pick.getTime() >= weekEnd) {
      const last = new Date(weekEnd - 3_600_000);
      last.setMinutes(0, 0, 0);
      return last.toISOString();
    }
    return pick.toISOString();
  }

  const pick = new Date(now);
  pick.setDate(pick.getDate() + 14);
  pick.setHours(9, 0, 0, 0);
  const monthEnd = endExclusiveLocalMonth(now);
  if (pick.getTime() >= monthEnd) {
    const last = new Date(monthEnd - 86_400_000);
    last.setHours(17, 0, 0, 0);
    return last.toISOString();
  }
  return pick.toISOString();
}

function defaultGoalTargetDate(bucket: "month" | "year"): string {
  const now = new Date();
  if (bucket === "year") {
    return `${now.getFullYear()}-12-31`;
  }
  const d = new Date(now);
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

/** Reschedule a task so it lands in another dashboard time bucket. */
function dueDatesForTaskBucket(
  task: Task,
  target: TaskBucketId,
  now: number,
): { dueAt: string; scheduledFromAt: string | null } {
  const dueAt = defaultDueForTaskBucket(target, now);
  const rawFrom = task.scheduledFromAt?.trim();
  if (!rawFrom) return { dueAt, scheduledFromAt: null };

  const dur =
    new Date(task.dueAt).getTime() - new Date(rawFrom).getTime();
  if (!(dur > 0)) return { dueAt, scheduledFromAt: null };

  return {
    scheduledFromAt: dueAt,
    dueAt: new Date(new Date(dueAt).getTime() + dur).toISOString(),
  };
}

function bucketMoveLabel(id: TaskBucketId): string {
  return BUCKET_META[id].label;
}

function priorityWeight(p: TaskPriority): number {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pw = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (pw !== 0) return pw;
    return taskOpenSortKey(a) - taskOpenSortKey(b);
  });
}

function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const ta = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
    const tb = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return b.progress - a.progress;
  });
}

function bucketOpenTasks(
  tasks: Task[],
  now: number,
): Record<"today" | "week" | "month", Task[]> {
  const open = tasks.filter((t) => !t.done);
  const today: Task[] = [];
  const week: Task[] = [];
  const month: Task[] = [];

  const todayStart = startOfLocalDay(now);
  const tomorrowStart = todayStart + 86_400_000;
  const weekEnd = endExclusiveLocalWeek(now);
  const monthEnd = endExclusiveLocalMonth(now);

  for (const task of open) {
    const anchor = taskOpenSortKey(task);

    if (taskTouchesTodayCalendar(task, now) || anchor < tomorrowStart) {
      today.push(task);
    } else if (anchor < weekEnd) {
      week.push(task);
    } else if (anchor < monthEnd) {
      month.push(task);
    }
  }

  return {
    today: sortTasks(today),
    week: sortTasks(week),
    month: sortTasks(month),
  };
}

function bucketActiveGoals(goals: Goal[]): { month: Goal[]; year: Goal[] } {
  const active = goals.filter(
    (g) => g.status === "active" && g.progress < 100,
  );
  return {
    month: sortGoals(active.filter((g) => g.horizon === "short_term")),
    year: sortGoals(
      active.filter(
        (g) => g.horizon === "one_year" || g.horizon === "long_term",
      ),
    ),
  };
}

function sameLocalCalendarDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** Dashboard task subtitle: dates only, no clock times (bucket carries "today"). */
function formatTaskPriorityMeta(
  task: Pick<Task, "dueAt" | "scheduledFromAt">,
  bucketId: TaskBucketId,
): string {
  if (bucketId === "today") return "";

  const raw = task.scheduledFromAt?.trim();
  if (!raw) return formatShortDate(task.dueAt);

  const fd = new Date(raw);
  const td = new Date(task.dueAt);
  if (Number.isNaN(fd.getTime()) || Number.isNaN(td.getTime())) {
    return formatShortDate(task.dueAt);
  }
  if (fd > td) return formatShortDate(task.dueAt);
  if (sameLocalCalendarDay(raw, task.dueAt)) return formatShortDate(task.dueAt);

  return `${formatShortDate(raw)} - ${formatShortDate(task.dueAt)}`;
}

function taskRow(
  task: Task,
  bucketId: TaskBucketId,
  rank: number,
): PriorityRow {
  return {
    kind: "task",
    id: `task-${task.id}`,
    taskId: task.id,
    bucketId,
    title: task.title,
    meta: formatTaskPriorityMeta(task, bucketId),
    accent: task.priority,
    rank,
  };
}

function goalRow(goal: Goal, rank: number): PriorityRow {
  const meta = goal.targetDate
    ? `Target ${goal.targetDate} · ${goal.progress}%`
    : `${goal.progress}% progress`;
  return {
    kind: "goal",
    id: `goal-${goal.id}`,
    title: goal.title,
    meta,
    href: "/goals",
    rank,
  };
}

function rankBadgeClass(bucketId: BucketId, rank: number): string {
  if (bucketId === "today" && rank === 1) {
    return "bg-primary/20 text-primary ring-1 ring-primary/35";
  }
  if (bucketId === "today" && rank <= 3) {
    return "bg-primary/10 text-primary/90 ring-1 ring-primary/20";
  }
  if (rank <= 3) {
    return "bg-white/[0.06] text-foreground/90 ring-1 ring-white/10";
  }
  return "bg-white/[0.03] text-muted-foreground ring-1 ring-white/[0.06]";
}

const PRIORITY_ROW_SURFACE =
  "border border-white/6 bg-[color-mix(in_oklab,var(--card)_70%,transparent)]";

function PriorityListItem({
  row,
  bucketId,
  onCloneTask,
  onMoveTask,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  row: PriorityRow;
  bucketId: BucketId;
  onCloneTask: (taskId: string) => void;
  onMoveTask: (taskId: string, target: TaskBucketId) => void;
  onMoveUp?: (taskId: string) => void;
  onMoveDown?: (taskId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const isTask = row.kind === "task";
  const moveTargets = isTask
    ? TASK_BUCKETS.filter((b) => b !== row.bucketId)
    : [];
  const todayRankLabel =
    bucketId === "today" && row.rank <= TODAY_RANK_LABELS.length
      ? TODAY_RANK_LABELS[row.rank - 1]
      : null;

  const body = (
    <>
      <span
        className={cn(
          "flex shrink-0 flex-col items-center justify-center rounded-none tabular-nums",
          bucketId === "today" ? "size-9" : "size-7",
          rankBadgeClass(bucketId, row.rank),
        )}
        aria-hidden
      >
        <span
          className={cn(
            "font-bold leading-none",
            bucketId === "today" ? "text-sm" : "text-[11px]",
          )}
        >
          {row.rank}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        {todayRankLabel ? (
          <span className="text-primary mb-0.5 block text-[9px] font-bold tracking-[0.16em] uppercase">
            {todayRankLabel}
          </span>
        ) : bucketId !== "today" && isTask && row.rank <= 3 ? (
          <span className="text-muted-foreground mb-0.5 block text-[9px] font-semibold tracking-[0.12em] uppercase">
            Priority {row.rank}
          </span>
        ) : null}
        <span className="text-foreground block text-sm font-medium leading-snug">
          {row.title}
        </span>
        {row.meta ? (
          <span className="text-muted-foreground mt-0.5 block text-[11px] tabular-nums">
            {row.meta}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <li>
      <div
        className={cn(
          PRIORITY_ROW_SURFACE,
          "group flex items-start gap-2 rounded-none px-2 py-2 transition-colors hover:border-white/12 hover:bg-[color-mix(in_oklab,var(--card)_88%,transparent)]",
          bucketId === "today" &&
            row.rank === 1 &&
            "border-primary/25 bg-[color-mix(in_oklab,var(--primary)_6%,var(--card)_70%)]",
        )}
      >
        {isTask ? (
          <Link
            href="/tasks"
            className="flex min-w-0 flex-1 items-start gap-2 px-1 py-0.5"
          >
            {body}
          </Link>
        ) : (
          <Link
            href={row.href}
            className="group/link flex min-w-0 flex-1 items-start gap-2 px-1 py-0.5"
          >
            {body}
            <ArrowRight
              className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100"
              aria-hidden
            />
          </Link>
        )}

        {isTask ? (
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
            {onMoveUp && onMoveDown ? (
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={!canMoveUp}
                  onClick={() => onMoveUp(row.taskId)}
                  className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-none transition-colors hover:bg-white/[0.06] disabled:opacity-25"
                  aria-label={`Move ${row.title} up in priority`}
                  title="Move up"
                >
                  <ChevronUp className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={!canMoveDown}
                  onClick={() => onMoveDown(row.taskId)}
                  className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-none transition-colors hover:bg-white/[0.06] disabled:opacity-25"
                  aria-label={`Move ${row.title} down in priority`}
                  title="Move down"
                >
                  <ChevronDown className="size-3.5" aria-hidden />
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onCloneTask(row.taskId)}
                className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-none transition-colors hover:bg-white/[0.06]"
                aria-label={`Clone ${row.title}`}
                title="Clone"
              >
                <Copy className="size-3.5" aria-hidden />
              </button>
              {moveTargets.length > 0 ? (
                <select
                  id={`move-${row.taskId}`}
                  defaultValue=""
                  onChange={(e) => {
                    const target = e.target.value as TaskBucketId;
                    if (!target) return;
                    onMoveTask(row.taskId, target);
                    e.target.value = "";
                  }}
                  className="text-muted-foreground hover:text-foreground h-7 max-w-[5.5rem] cursor-pointer rounded-none border-0 bg-transparent py-0 pr-1 pl-0.5 text-[10px] font-medium outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  aria-label={`Move ${row.title} to another horizon`}
                  title="Move to…"
                >
                  <option value="">Move…</option>
                  {moveTargets.map((b) => (
                    <option key={b} value={b}>
                      {bucketMoveLabel(b)}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function PriorityQuickAdd({
  bucketId,
  strategicParentId,
}: {
  bucketId: BucketId;
  /** First long-term goal id; enables near-term goal quick-add in month bucket. */
  strategicParentId: string | null;
}) {
  const { addTask } = useTasks();
  const { addGoal } = useGoals();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [monthMode, setMonthMode] = useState<"task" | "goal">("task");

  const isYear = bucketId === "year";
  const isMonth = bucketId === "month";
  const useGoal =
    isYear || (isMonth && monthMode === "goal" && strategicParentId);

  const placeholder = useMemo(() => {
    if (isYear) return "One-year goal…";
    if (isMonth && monthMode === "goal") return "Near-term goal (30–90 d)…";
    if (bucketId === "today") return "Add for today…";
    if (bucketId === "week") return "Add for this week…";
    return "Add for this month…";
  }, [bucketId, isMonth, isYear, monthMode]);

  const submit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = title.trim();
      if (!trimmed) {
        setError("Write a short title.");
        inputRef.current?.focus();
        return;
      }

      setError(null);
      setPending(true);

      try {
        if (useGoal) {
          if (isMonth && !strategicParentId) {
            setError("Add a year-level goal first, or switch to task.");
            return;
          }
          const result = await addGoal({
            horizon: isYear ? "one_year" : "short_term",
            longTermGoalId: isYear ? null : strategicParentId,
            title: trimmed,
            metric: null,
            targetDate: defaultGoalTargetDate(isYear ? "year" : "month"),
            progress: 0,
            status: "active",
            area: null,
            reviewNote: null,
          });
          if (!result.ok) {
            setError(result.error ?? "Could not save goal.");
            return;
          }
        } else {
          addTask({
            title: trimmed,
            relatedKind: "none",
            relatedId: null,
            dueAt: defaultDueForTaskBucket(
              bucketId as "today" | "week" | "month",
              Date.now(),
            ),
            priority: "high",
            assignee: "You",
          });
        }
        setTitle("");
        inputRef.current?.focus();
      } finally {
        setPending(false);
      }
    },
    [
      addGoal,
      addTask,
      bucketId,
      isMonth,
      isYear,
      strategicParentId,
      title,
      useGoal,
    ],
  );

  return (
    <div className="space-y-1.5">
      <form
        onSubmit={submit}
        className={cn(
          PRIORITY_ROW_SURFACE,
          "flex h-9 items-stretch overflow-hidden rounded-none",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={title}
          disabled={pending}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent px-3 text-[12px] outline-none focus-visible:ring-0"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Add priority"
          className="text-foreground hover:text-primary flex h-full w-9 shrink-0 items-center justify-center border-0 border-l border-white/6 bg-transparent transition-colors hover:bg-[color-mix(in_oklab,var(--card)_88%,transparent)] disabled:opacity-45"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </form>
      {isMonth && strategicParentId ? (
        <button
          type="button"
          onClick={() => {
            setMonthMode((m) => (m === "task" ? "goal" : "task"));
            setError(null);
          }}
          className="text-muted-foreground hover:text-primary text-[10px] font-medium underline-offset-2 hover:underline"
        >
          {monthMode === "task"
            ? "Add as near-term goal instead"
            : "Add as task instead"}
        </button>
      ) : null}
      {error ? (
        <p className="text-destructive text-[10px] leading-snug">{error}</p>
      ) : null}
    </div>
  );
}

function PriorityBucket({
  bucketId,
  rows,
  strategicParentId,
  onCloneTask,
  onMoveTask,
  onMoveTaskUp,
  onMoveTaskDown,
  taskOrderIds,
}: {
  bucketId: BucketId;
  rows: PriorityRow[];
  strategicParentId: string | null;
  onCloneTask: (taskId: string) => void;
  onMoveTask: (taskId: string, target: TaskBucketId) => void;
  onMoveTaskUp?: (taskId: string) => void;
  onMoveTaskDown?: (taskId: string) => void;
  taskOrderIds?: string[];
}) {
  const meta = BUCKET_META[bucketId];
  const isTaskBucket = bucketId !== "year";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-2",
        bucketId === "today" &&
          "rounded-none ring-1 ring-primary/15 bg-[color-mix(in_oklab,var(--primary)_4%,transparent)] p-3 -m-3 sm:p-4 sm:-m-4",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-foreground text-sm font-semibold tracking-tight">
            {meta.label}
            {rows.length > 0 ? (
              <span className="text-muted-foreground ml-1.5 text-[11px] font-normal tabular-nums">
                ({rows.length})
              </span>
            ) : null}
          </h3>
          <p className="text-muted-foreground text-[11px]">{meta.hint}</p>
        </div>
        <Link
          href={meta.href}
          className="text-primary hover:text-primary/85 text-[10px] font-semibold tracking-wide uppercase underline-offset-4 hover:underline"
        >
          Open
        </Link>
      </div>
      <div className="max-h-[min(70vh,640px)] min-h-0 overflow-y-auto overscroll-contain pr-0.5">
        {rows.length === 0 ? (
          <p className="text-muted-foreground rounded-none border border-dashed border-white/8 px-3 py-4 text-center text-xs">
            Nothing here yet.
          </p>
        ) : (
          <ul className="grid list-none gap-1.5 p-0">
            {rows.map((row) => {
              const taskIndex =
                row.kind === "task" && taskOrderIds
                  ? taskOrderIds.indexOf(row.taskId)
                  : -1;
              return (
                <PriorityListItem
                  key={row.id}
                  row={row}
                  bucketId={bucketId}
                  onCloneTask={onCloneTask}
                  onMoveTask={onMoveTask}
                  onMoveUp={
                    isTaskBucket && row.kind === "task"
                      ? onMoveTaskUp
                      : undefined
                  }
                  onMoveDown={
                    isTaskBucket && row.kind === "task"
                      ? onMoveTaskDown
                      : undefined
                  }
                  canMoveUp={taskIndex > 0}
                  canMoveDown={
                    taskIndex >= 0 &&
                    taskOrderIds != null &&
                    taskIndex < taskOrderIds.length - 1
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
      <PriorityQuickAdd
        bucketId={bucketId}
        strategicParentId={strategicParentId}
      />
    </div>
  );
}

export function DashboardPrioritiesSection() {
  const { tasks, addTask, updateTask } = useTasks();
  const { goals } = useGoals();
  const now = Date.now();

  const [taskOrder, setTaskOrder] = useState<DashboardTaskOrder>(EMPTY_ORDER);
  const [orderHydrated, setOrderHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setTaskOrder(loadDashboardOrder());
      setOrderHydrated(true);
    });
  }, []);

  const taskBucketsRaw = useMemo(
    () => bucketOpenTasks(tasks, now),
    [tasks, now],
  );

  const syncedOrder = useMemo(() => {
    if (!orderHydrated) {
      return {
        today: taskBucketsRaw.today.map((t) => t.id),
        week: taskBucketsRaw.week.map((t) => t.id),
        month: taskBucketsRaw.month.map((t) => t.id),
      };
    }
    return {
      today: mergeTaskOrder(taskOrder.today, taskBucketsRaw.today),
      week: mergeTaskOrder(taskOrder.week, taskBucketsRaw.week),
      month: mergeTaskOrder(taskOrder.month, taskBucketsRaw.month),
    };
  }, [orderHydrated, taskOrder, taskBucketsRaw]);

  useEffect(() => {
    if (!orderHydrated) return;
    const unchanged =
      syncedOrder.today.join() === taskOrder.today.join() &&
      syncedOrder.week.join() === taskOrder.week.join() &&
      syncedOrder.month.join() === taskOrder.month.join();
    if (!unchanged) {
      setTaskOrder(syncedOrder);
      persistDashboardOrder(syncedOrder);
    }
  }, [orderHydrated, syncedOrder, taskOrder]);

  const orderedTaskBuckets = useMemo(
    () => ({
      today: applyTaskOrder(taskBucketsRaw.today, syncedOrder.today),
      week: applyTaskOrder(taskBucketsRaw.week, syncedOrder.week),
      month: applyTaskOrder(taskBucketsRaw.month, syncedOrder.month),
    }),
    [taskBucketsRaw, syncedOrder],
  );

  const nudgeTaskOrder = useCallback(
    (bucket: TaskBucketId, taskId: string, direction: -1 | 1) => {
      setTaskOrder((prev) => {
        const next = {
          ...prev,
          [bucket]: reorderTaskId(prev[bucket], taskId, direction),
        };
        persistDashboardOrder(next);
        return next;
      });
    },
    [],
  );

  const moveTaskUp = useCallback(
    (bucket: TaskBucketId, taskId: string) => {
      nudgeTaskOrder(bucket, taskId, -1);
    },
    [nudgeTaskOrder],
  );

  const moveTaskDown = useCallback(
    (bucket: TaskBucketId, taskId: string) => {
      nudgeTaskOrder(bucket, taskId, 1);
    },
    [nudgeTaskOrder],
  );

  const cloneTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      addTask({
        title: task.title,
        relatedKind: task.relatedKind,
        relatedId: task.relatedId,
        scheduledFromAt: task.scheduledFromAt,
        dueAt: task.dueAt,
        priority: task.priority,
        repeatDaily: task.repeatDaily,
        assignee: task.assignee,
      });
    },
    [addTask, tasks],
  );

  const moveTask = useCallback(
    (taskId: string, target: TaskBucketId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const next = dueDatesForTaskBucket(task, target, Date.now());
      updateTask(taskId, next);
    },
    [tasks, updateTask],
  );

  const strategicParentId = useMemo(() => {
    const oneYear = goals.find(
      (g) => g.horizon === "one_year" && g.status === "active",
    );
    if (oneYear) return oneYear.id;
    return (
      goals.find((g) => g.horizon === "long_term" && g.status === "active")
        ?.id ?? null
    );
  }, [goals]);

  const buckets = useMemo(() => {
    const goalBuckets = bucketActiveGoals(goals);

    const today = orderedTaskBuckets.today.map((t, i) =>
      taskRow(t, "today", i + 1),
    );
    const week = orderedTaskBuckets.week.map((t, i) =>
      taskRow(t, "week", i + 1),
    );
    const monthTasks = orderedTaskBuckets.month.map((t, i) =>
      taskRow(t, "month", i + 1),
    );
    const monthGoals = goalBuckets.month.map((g, i) =>
      goalRow(g, monthTasks.length + i + 1),
    );
    const month = [...monthTasks, ...monthGoals];
    const year = goalBuckets.year.map((g, i) => goalRow(g, i + 1));

    return { today, week, month, year };
  }, [orderedTaskBuckets, goals]);

  const totalCount =
    buckets.today.length +
    buckets.week.length +
    buckets.month.length +
    buckets.year.length;

  return (
    <section
      className="rounded-none border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_78%,transparent)] backdrop-blur-md"
      aria-labelledby="dashboard-priorities-heading"
    >
      <header className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="space-y-1">
          <div className="text-primary flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
            <Target className="size-3.5" aria-hidden />
            Top priorities
          </div>
          <h2
            id="dashboard-priorities-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Today through the year
          </h2>
          <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
            Numbered order is what matters most: #1 in Today is your first move.
            Use the arrows to reorder; it saves automatically.
            {totalCount > 0 ? ` ${totalCount} items across four horizons.` : ""}
          </p>
        </div>
        <Link
          href="/today"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "shrink-0 gap-1.5",
          )}
        >
          Today view
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      <div className="grid gap-6 px-5 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <PriorityBucket
          bucketId="today"
          rows={buckets.today}
          strategicParentId={strategicParentId}
          onCloneTask={cloneTask}
          onMoveTask={moveTask}
          onMoveTaskUp={(id) => moveTaskUp("today", id)}
          onMoveTaskDown={(id) => moveTaskDown("today", id)}
          taskOrderIds={syncedOrder.today}
        />
        <PriorityBucket
          bucketId="week"
          rows={buckets.week}
          strategicParentId={strategicParentId}
          onCloneTask={cloneTask}
          onMoveTask={moveTask}
          onMoveTaskUp={(id) => moveTaskUp("week", id)}
          onMoveTaskDown={(id) => moveTaskDown("week", id)}
          taskOrderIds={syncedOrder.week}
        />
        <PriorityBucket
          bucketId="month"
          rows={buckets.month}
          strategicParentId={strategicParentId}
          onCloneTask={cloneTask}
          onMoveTask={moveTask}
          onMoveTaskUp={(id) => moveTaskUp("month", id)}
          onMoveTaskDown={(id) => moveTaskDown("month", id)}
          taskOrderIds={syncedOrder.month}
        />
        <PriorityBucket
          bucketId="year"
          rows={buckets.year}
          strategicParentId={strategicParentId}
          onCloneTask={cloneTask}
          onMoveTask={moveTask}
        />
      </div>
    </section>
  );
}
