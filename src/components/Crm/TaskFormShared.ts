import type { Task, TaskPriority } from "@/lib/crm/types";

/** Aligns with Today timeline (07:00–20:00 band) so new tasks land on “today” when possible. */
const DEFAULT_LOCAL_DAY_START_H = 7;
/** Last hour row on Today is 19:00 → 20:00 */
const DEFAULT_LOCAL_TIMELINE_LAST_H = 19;

/**
 * Default due for new tasks: next free whole hour today inside the day timeline,
 * otherwise tomorrow 09:00. Keeps Tasks → Today in sync with /today.
 */
export function defaultDueIso() {
  const now = new Date();

  let h = now.getHours();
  if (now.getMinutes() > 5) h += 1;
  if (h < DEFAULT_LOCAL_DAY_START_H) h = DEFAULT_LOCAL_DAY_START_H;

  const candidate = new Date(now);
  candidate.setMinutes(0, 0, 0);
  candidate.setHours(h);

  while (candidate.getTime() <= now.getTime()) {
    h += 1;
    candidate.setHours(h);
  }

  if (candidate.getHours() > DEFAULT_LOCAL_TIMELINE_LAST_H) {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next.toISOString();
  }

  return candidate.toISOString();
}

export function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string) {
  return new Date(local).toISOString();
}

/** Next calendar day, same clock time local (DST-safe via Date). */
export function advanceDueNextLocalDay(dueIso: string): string {
  const d = new Date(dueIso);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export const TASK_PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  hint: string;
}[] = [
  { value: "high", label: "Peak", hint: "High" },
  { value: "medium", label: "Steady", hint: "Medium" },
  { value: "low", label: "Easy", hint: "Low" },
];

function sameLocalCalendarDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatShortHm(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** One line for Tasks / Today timetable: optional From–To, else Due only. */
export function formatTaskScheduleLine(
  task: Pick<Task, "dueAt" | "scheduledFromAt">,
): string {
  const raw = task.scheduledFromAt?.trim();
  if (!raw) return formatShortHm(task.dueAt);
  const fd = new Date(raw);
  const td = new Date(task.dueAt);
  if (Number.isNaN(fd.getTime()) || Number.isNaN(td.getTime())) return formatShortHm(task.dueAt);
  if (fd > td) return formatShortHm(task.dueAt);

  if (sameLocalCalendarDay(raw, task.dueAt)) {
    return `${formatShortHm(raw)}–${formatShortHm(task.dueAt)}`;
  }
  const dtf = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dtf.format(fd)} → ${dtf.format(td)}`;
}

/** Timeline / drag anchor: window start if set, else end. */
export function taskSchedulingAnchorMs(task: Pick<Task, "dueAt" | "scheduledFromAt">): number {
  const from = task.scheduledFromAt?.trim();
  if (from) return new Date(from).getTime();
  return new Date(task.dueAt).getTime();
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isoOnLocalCalendarDay(iso: string, anchorMs: number = Date.now()): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return startOfLocalDay(t) === startOfLocalDay(anchorMs);
}

/** Open task “on” this calendar day in local time (starts or ends today). */
export function taskTouchesTodayCalendar(
  task: Pick<Task, "dueAt" | "scheduledFromAt">,
  anchorMs: number = Date.now(),
): boolean {
  if (isoOnLocalCalendarDay(task.dueAt, anchorMs)) return true;
  const from = task.scheduledFromAt?.trim();
  if (from && isoOnLocalCalendarDay(from, anchorMs)) return true;
  return false;
}

/** Sort open tasks for “next” / ordering: earlier anchor first. */
export function taskOpenSortKey(task: Pick<Task, "dueAt" | "scheduledFromAt">): number {
  return taskSchedulingAnchorMs(task);
}

/** After daily repeat: advance both window edges by one local day. */
export function advanceScheduledWindowNextLocalDay(fromIso: string | null, toIso: string): {
  scheduledFromAt: string | null;
  dueAt: string;
} {
  const nextTo = advanceDueNextLocalDay(toIso);
  if (!fromIso?.trim()) return { scheduledFromAt: null, dueAt: nextTo };
  return {
    scheduledFromAt: advanceDueNextLocalDay(fromIso),
    dueAt: nextTo,
  };
}
