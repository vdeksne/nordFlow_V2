"use client";

import Link from "next/link";
import { Check, Clock3, Focus, GripVertical } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { Task, TaskPriority } from "@/lib/crm/types";
import { formatTaskRelatedLine } from "@/lib/crm/task-related-label";
import { cn } from "@/lib/utils";

import { AddTaskSheet } from "./AddTaskSheet";
import { useCompanies } from "./CompaniesContext";
import { useContacts } from "./ContactsContext";
import { useDeals } from "./DealsContext";
import { useGoals } from "./GoalsContext";
import { useLeads } from "./LeadsContext";
import { TaskDetailSheet } from "./TaskDetailSheet";
import {
  TASK_PRIORITY_OPTIONS,
  formatTaskScheduleLine,
  taskOpenSortKey,
  taskTouchesTodayCalendar,
} from "./TaskFormShared";
import { useTasks } from "./TasksContext";

const DAY_START_HOUR = 0;
/** Last labeled hour row (23:00–24:00 band). Full calendar = 24 hour rows. */
const DAY_END_HOUR = 23;
const TIMELINE_HOUR_COUNT = DAY_END_HOUR - DAY_START_HOUR + 1;
/** Row height tuned so 24h (~1152px) fits in the scroll panel on most screens. */
const ROW_HEIGHT_PX = 48;
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

const TIMELINE_BLOCK_EST_HEIGHT_PX = 76;
const TIMELINE_BLOCK_MIN_GAP_PX = 4;
/** Snap reschedule targets to multiples of N minutes inside the timeline. */
const SCHEDULE_DRAG_SNAP_MINUTES = 10;
/** Below this vertical distance (px) on the timeline, treat as a click (single-slot quick capture). */
const TIMELINE_RANGE_DRAG_THRESHOLD_PX = 14;
/** Catch-up chip: movement past this begins a drag-to-timeline reschedule. */
const CATCH_UP_DRAG_THRESHOLD_PX = 12;

function timelineMinuteRange(): { start: number; end: number } {
  const start = DAY_START_HOUR * 60;
  const end = (DAY_END_HOUR + 1) * 60;
  return { start, end };
}

/** Center Y → due timestamp; keeps calendar day / date from previous due. */
function dueIsoFromTimelineCenterAndHeight(
  centerYInsideSlot: number,
  slotInnerHeightPx: number,
  baseDueIso: string,
): string {
  if (slotInnerHeightPx <= 0) return baseDueIso;
  const frac = clamp01(centerYInsideSlot / slotInnerHeightPx);
  const { start: startMins, end: endMins } = timelineMinuteRange();
  let mins = Math.round(startMins + frac * (endMins - startMins));
  const step = SCHEDULE_DRAG_SNAP_MINUTES;
  mins =
    Math.round((mins - startMins) / step) * step + startMins;
  mins = Math.max(Math.min(mins, endMins), startMins);
  let hour = Math.floor(mins / 60);
  let minute = mins % 60;
  const d = new Date(baseDueIso);
  /** Bottom of grid maps to “24:00”; JS Date rolls hour 24 to next calendar day - clamp to last snapped slot today. */
  if (hour >= 24) {
    hour = 23;
    minute = Math.floor(59 / step) * step;
  }
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

type TimelineDragSession = {
  pointerId: number;
  task: Task;
  grabOffsetY: number;
  lastTopPx: number;
  blockHeightPx: number;
};

function tentativeTimeLabel(
  centerYInsideSlot: number,
  slotInnerHeightPx: number,
  baseDueIso: string,
): string {
  if (slotInnerHeightPx <= 0) return "-";
  const ts = dueIsoFromTimelineCenterAndHeight(
    centerYInsideSlot,
    slotInnerHeightPx,
    baseDueIso,
  );
  return formatShortTime(ts);
}

function tentativeWindowPreview(
  topYInsideSlot: number,
  blockHeightPx: number,
  slotInnerHeightPx: number,
  task: Task,
): string {
  if (slotInnerHeightPx <= 0 || blockHeightPx <= 0) return "-";
  const rawFrom = task.scheduledFromAt?.trim();
  /** From–To: map top edge → window start time; single instant: center of pill → due. */
  if (rawFrom) {
    const nextFromIso = dueIsoFromTimelineCenterAndHeight(
      topYInsideSlot,
      slotInnerHeightPx,
      taskTimelineAnchorIso(task),
    );
    const dur =
      new Date(task.dueAt).getTime() - new Date(rawFrom).getTime();
    if (!(dur > 0)) return formatShortTime(nextFromIso);
    const nextToIso = new Date(
      new Date(nextFromIso).getTime() + dur,
    ).toISOString();
    return formatTaskScheduleLine({
      scheduledFromAt: nextFromIso,
      dueAt: nextToIso,
    });
  }
  const centerY = topYInsideSlot + blockHeightPx / 2;
  const nextDueIso = dueIsoFromTimelineCenterAndHeight(
    centerY,
    slotInnerHeightPx,
    task.dueAt,
  );
  return formatShortTime(nextDueIso);
}

function clampTimelineTopForHeight(
  topPxCandidate: number,
  innerHeightPx: number,
  blockHeightPx: number,
): number {
  const min = TIMELINE_BLOCK_MIN_GAP_PX;
  const max =
    innerHeightPx - blockHeightPx - TIMELINE_BLOCK_MIN_GAP_PX;
  if (max < min) return min;
  return Math.min(Math.max(topPxCandidate, min), max);
}

/** Padding-aware inner viewport for dragging against “top” placements. */
function getTimelineSlotInnerBox(el: HTMLElement | null): {
  innerTopViewport: number;
  innerHeight: number;
} | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  const pt = Number.parseFloat(cs.paddingTop || "0");
  const pb = Number.parseFloat(cs.paddingBottom || "0");
  /** Prefer layout box height - `clientHeight` can read 0 briefly in nested flex layouts. */
  const innerHeight = Math.max(0, rect.height - pt - pb);
  return {
    innerTopViewport: rect.top + pt,
    innerHeight,
  };
}

/** Quick-capture minute pickers aligned with SCHEDULE_DRAG_SNAP_MINUTES. */
function quickMinuteChoices(): number[] {
  const choices: number[] = [];
  for (let m = 0; m < 60; m += SCHEDULE_DRAG_SNAP_MINUTES) choices.push(m);
  return choices;
}

function clampHourSelect(h: number): number {
  return Math.min(Math.max(h, DAY_START_HOUR), DAY_END_HOUR);
}

function nearestChoice(value: number, choices: readonly number[]): number {
  let best = choices[0] ?? 0;
  let bestDiff = Infinity;
  for (const v of choices) {
    const d = Math.abs(v - value);
    if (d < bestDiff || (d === bestDiff && v < best)) {
      best = v;
      bestDiff = d;
    }
  }
  return best;
}

function hourMinuteFromPointerInTimeline(
  clientY: number,
  slotEl: HTMLElement,
): { hour: number; minute: number } | null {
  const metrics = getTimelineSlotInnerBox(slotEl);
  if (!metrics || metrics.innerHeight <= 0) return null;

  let relYC = clientY - metrics.innerTopViewport;
  relYC = clamp01(relYC / metrics.innerHeight) * metrics.innerHeight;

  const iso = dueIsoFromTimelineCenterAndHeight(
    relYC,
    metrics.innerHeight,
    isoTodayAtHourMinute(12, 0),
  );

  const d = new Date(iso);
  return {
    hour: clampHourSelect(d.getHours()),
    minute: nearestChoice(d.getMinutes(), quickMinuteChoices()),
  };
}

function dueTopPct(iso: string): number {
  const startMins = DAY_START_HOUR * 60;
  const endMins = (DAY_END_HOUR + 1) * 60;
  const d = new Date(iso);
  let cur = d.getHours() * 60 + d.getMinutes();
  cur = Math.max(startMins, Math.min(endMins, cur));
  const total = endMins - startMins;
  return ((cur - startMins) / total) * 100;
}

/** Local clock clamped onto the timeline band (minutes from midnight → last band edge inclusive). */
function clampTimelineClockMinutes(iso: string): number {
  const lo = DAY_START_HOUR * 60;
  const hi = (DAY_END_HOUR + 1) * 60;
  const d = new Date(iso);
  let cur = d.getHours() * 60 + d.getMinutes();
  return Math.max(lo, Math.min(hi, cur));
}

function timelineDayDurationMinutes(): number {
  return (DAY_END_HOUR + 1 - DAY_START_HOUR) * 60;
}

/** Minutes span for today's band; null when treating as single instant (no usable window). */
function taskTimelineWindowMinutes(
  task: Task,
  anchorMs: number,
): { startM: number; endM: number } | null {
  const rawFrom = task.scheduledFromAt?.trim();
  if (!rawFrom) return null;
  const fromMs = new Date(rawFrom).getTime();
  const toMs = new Date(task.dueAt).getTime();
  if (!(toMs > fromMs)) return null;

  const anchorDayStart = startOfDay(anchorMs);
  const fromDayStart = startOfDay(fromMs);
  const toDayStart = startOfDay(toMs);
  const bandEndExclusive = (DAY_END_HOUR + 1) * 60;
  let startM: number;
  let endM: number;

  if (fromDayStart < anchorDayStart && toDayStart >= anchorDayStart) {
    startM = DAY_START_HOUR * 60;
    endM = clampTimelineClockMinutes(task.dueAt);
  } else if (fromDayStart === anchorDayStart && toDayStart > anchorDayStart) {
    startM = clampTimelineClockMinutes(rawFrom);
    endM = bandEndExclusive;
  } else if (
    fromDayStart === anchorDayStart &&
    toDayStart === anchorDayStart
  ) {
    startM = clampTimelineClockMinutes(rawFrom);
    endM = clampTimelineClockMinutes(task.dueAt);
  } else {
    return null;
  }

  const snap = SCHEDULE_DRAG_SNAP_MINUTES;
  if (endM <= startM) endM = Math.min(startM + snap, bandEndExclusive);
  if (endM <= startM) return null;
  return { startM, endM };
}

function idealTimelineBlockRect(
  task: Task,
  gridHeightPx: number,
  anchorMs: number,
): { topPx: number; heightPx: number } {
  const totalM = timelineDayDurationMinutes();
  const win = taskTimelineWindowMinutes(task, anchorMs);
  if (win) {
    const spanM = win.endM - win.startM;
    const topPx = ((win.startM - DAY_START_HOUR * 60) / totalM) * gridHeightPx;
    let heightPx = (spanM / totalM) * gridHeightPx;
    heightPx = Math.max(heightPx, BLOCK_MIN_HEIGHT);
    return { topPx, heightPx };
  }
  const center = (dueTopPct(taskTimelineAnchorIso(task)) / 100) * gridHeightPx;
  const h = TIMELINE_BLOCK_EST_HEIGHT_PX;
  return { topPx: center - h / 2, heightPx: h };
}

function taskTimelineAnchorIso(
  task: Pick<Task, "dueAt" | "scheduledFromAt">,
): string {
  const f = task.scheduledFromAt?.trim();
  return f ?? task.dueAt;
}

/** True when the task has a From–To window worth stretching on the grid. */
function isTimelineWindowTask(task: Pick<Task, "dueAt" | "scheduledFromAt">): boolean {
  const raw = task.scheduledFromAt?.trim();
  if (!raw) return false;
  return new Date(task.dueAt).getTime() - new Date(raw).getTime() > 0;
}

type TimelinePlacement = { task: Task; topPx: number; heightPx: number };

function placeTasksOnTimeline(
  tasks: Task[],
  gridHeightPx: number,
  anchorMs: number,
): TimelinePlacement[] {
  const sorted = [...tasks].sort(
    (a, b) => taskOpenSortKey(a) - taskOpenSortKey(b),
  );

  let prevBottom = -1;
  const out: TimelinePlacement[] = [];

  for (const task of sorted) {
    let { topPx, heightPx } = idealTimelineBlockRect(
      task,
      gridHeightPx,
      anchorMs,
    );

    if (!isTimelineWindowTask(task)) {
      heightPx = TIMELINE_BLOCK_EST_HEIGHT_PX;
    }

    topPx = Math.max(
      TIMELINE_BLOCK_MIN_GAP_PX,
      Math.min(gridHeightPx - heightPx - TIMELINE_BLOCK_MIN_GAP_PX, topPx),
    );
    if (prevBottom >= 0 && topPx < prevBottom + TIMELINE_BLOCK_MIN_GAP_PX) {
      topPx = prevBottom + TIMELINE_BLOCK_MIN_GAP_PX;
      topPx = Math.min(
        gridHeightPx - heightPx - TIMELINE_BLOCK_MIN_GAP_PX,
        topPx,
      );
    }
    prevBottom = topPx + heightPx;
    out.push({ task, topPx, heightPx });
  }

  return out;
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

/** Snapped clock time from a Y coordinate inside the timeline inner box (today). */
function hourMinuteFromInnerY(
  relYInsideSlot: number,
  slotInnerHeightPx: number,
): { hour: number; minute: number } {
  const rel = Math.min(
    Math.max(relYInsideSlot, 0),
    slotInnerHeightPx,
  );
  const iso = dueIsoFromTimelineCenterAndHeight(
    rel,
    slotInnerHeightPx,
    isoTodayAtHourMinute(12, 0),
  );
  const d = new Date(iso);
  return {
    hour: clampHourSelect(d.getHours()),
    minute: nearestChoice(d.getMinutes(), quickMinuteChoices()),
  };
}

/** Build From / To snapped times from a drag; ensures To is strictly after From. */
function snappedWindowFromInnerRange(
  innerY1: number,
  innerY2: number,
  innerH: number,
): {
  from: { hour: number; minute: number };
  to: { hour: number; minute: number };
} {
  const top = Math.min(innerY1, innerY2);
  const bot = Math.max(innerY1, innerY2);
  let from = hourMinuteFromInnerY(top, innerH);
  let to = hourMinuteFromInnerY(bot, innerH);
  let fromMs = new Date(isoTodayAtHourMinute(from.hour, from.minute)).getTime();
  let toMs = new Date(isoTodayAtHourMinute(to.hour, to.minute)).getTime();
  const step = SCHEDULE_DRAG_SNAP_MINUTES * 60 * 1000;
  const bandEndMs = new Date(
    isoTodayAtHourMinute(
      DAY_END_HOUR,
      Math.floor(59 / SCHEDULE_DRAG_SNAP_MINUTES) *
        SCHEDULE_DRAG_SNAP_MINUTES,
    ),
  ).getTime();

  if (toMs <= fromMs) {
    toMs = Math.min(fromMs + step, bandEndMs);
    const td = new Date(toMs);
    to = {
      hour: clampHourSelect(td.getHours()),
      minute: nearestChoice(td.getMinutes(), quickMinuteChoices()),
    };
    fromMs = new Date(isoTodayAtHourMinute(from.hour, from.minute)).getTime();
    toMs = new Date(isoTodayAtHourMinute(to.hour, to.minute)).getTime();
    if (toMs <= fromMs) {
      fromMs = Math.max(
        fromMs - step,
        new Date(isoTodayAtHourMinute(DAY_START_HOUR, 0)).getTime(),
      );
      const fd = new Date(fromMs);
      from = {
        hour: clampHourSelect(fd.getHours()),
        minute: nearestChoice(fd.getMinutes(), quickMinuteChoices()),
      };
    }
  }
  return { from, to };
}

function innerYFromClientY(clientY: number, metrics: { innerTopViewport: number; innerHeight: number }): number {
  const raw = clientY - metrics.innerTopViewport;
  return Math.min(Math.max(raw, 0), metrics.innerHeight);
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
  onGripPointerDown,
  dragging,
  scheduledTimeDisplay,
  fillHeight = false,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onOpen: () => void;
  /** Grip control: drag up/down on the timeline to move the scheduled time. */
  onGripPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  dragging?: boolean;
  /** During drag overlay: shown instead of parsing task.dueAt for the badge. */
  scheduledTimeDisplay?: string;
  /** Long From–To blocks: fill slot height and scroll overflow inside. */
  fillHeight?: boolean;
}) {
  const { deals } = useDeals();
  const { companies } = useCompanies();
  const { leads } = useLeads();
  const { contacts } = useContacts();
  const { goals } = useGoals();
  const relatedLine = useMemo(
    () =>
      formatTaskRelatedLine(task, {
        deals,
        companies,
        leads,
        contacts,
        goals,
      }),
    [task, deals, companies, leads, contacts, goals],
  );

  const overdue = isOverdue(task.dueAt, task.done);

  const displayedTime =
    scheduledTimeDisplay ?? formatTaskScheduleLine(task);

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
        "relative flex w-full cursor-pointer gap-1.5 rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_90%,transparent)] p-2 text-left backdrop-blur-sm transition-[border-color,box-shadow,opacity] hover:border-white/[0.14]",
        fillHeight ? "h-full min-h-0" : "h-auto min-h-[4.5rem]",
        task.done && "opacity-[0.65]",
        overdue && !task.done && "border-rose-400/30",
        dragging &&
          "ring-primary/50 shadow-primary/25 z-40 ring-2 ring-offset-1 ring-offset-[color-mix(in_oklab,var(--card)_92%,transparent)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.45]",
          priorityAccent(task.priority),
        )}
      />
      {onGripPointerDown ? (
        <button
          type="button"
          aria-label="Drag up or down to reschedule this task"
          className={cn(
            "relative z-[1] flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-none border border-transparent text-muted-foreground transition-colors hover:border-white/[0.1] hover:text-foreground active:cursor-grabbing",
          )}
          onPointerDown={(e) => {
            e.stopPropagation();
            onGripPointerDown(e);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-[18px] opacity-85" aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={
          task.done
            ? "Mark as open"
            : task.repeatDaily
              ? "Finish today - reschedule for tomorrow at the same time"
              : "Mark as done"
        }
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        className={cn(
          "relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-none border transition-colors",
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
      <div
        className={cn(
          "relative z-[1] flex min-w-0 flex-1 flex-col gap-0.5 py-0.5",
          fillHeight && "min-h-0 overflow-y-auto overflow-x-hidden",
        )}
      >
        <div className="flex flex-wrap shrink-0 items-center gap-1.5">
          <span className="text-muted-foreground text-[9px] font-semibold tracking-[0.14em] uppercase">
            {priorityLabel(task.priority)}
          </span>
          <span
            className={cn(
              "text-foreground/85 flex items-center gap-1 text-[10px] font-medium tabular-nums transition-colors",
              dragging && scheduledTimeDisplay && "text-primary",
            )}
          >
            <Clock3 className="size-3 opacity-70" aria-hidden />
            {displayedTime}
          </span>
          {task.repeatDaily ? (
            <span className="text-primary/95 border-primary/35 rounded-none border px-1.5 py-0.5 text-[8px] font-semibold tracking-wide uppercase">
              Daily
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "text-[12px] leading-snug font-semibold tracking-tight",
            fillHeight ? "line-clamp-3" : "line-clamp-2",
            task.done && "text-muted-foreground line-through decoration-white/25",
          )}
        >
          {task.title}
        </p>
        {fillHeight ? (
          <p className="text-muted-foreground truncate text-[10px] tracking-wide uppercase">
            {relatedLine}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TodayPageClient() {
  const { tasks, addTask, toggleTask, updateTask } = useTasks();
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nowTs = useNowMinute();

  const [quickTitle, setQuickTitle] = useState("");
  const [quickHour, setQuickHour] = useState(defaultQuickHour);
  const [quickMinute, setQuickMinute] = useState(0);
  /** When set (e.g. after drag-range on timeline), Quick capture creates a From–To window ending at quickHour/quickMinute. */
  const [quickRangeFromHm, setQuickRangeFromHm] = useState<{
    hour: number;
    minute: number;
  } | null>(null);
  const [quickPriority, setQuickPriority] =
    useState<TaskPriority>("medium");
  const [quickRepeatDaily, setQuickRepeatDaily] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const [timelineRangeDraft, setTimelineRangeDraft] = useState<{
    topPx: number;
    heightPx: number;
  } | null>(null);

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
    timelineTasks,
    hourLabels,
  } = useMemo(() => {
    const anchorNow = nowTs;
    const open = tasks.filter((t) => !t.done);
    const doneToday = tasks.filter(
      (t) => t.done && isDueToday(t.dueAt),
    );

    const overdue = open.filter((t) => isOverdue(t.dueAt, false));
    const dueToday = open.filter((t) =>
      taskTouchesTodayCalendar(t, anchorNow),
    );

    const sortedMit = [...dueToday].sort((a, b) => {
      const pr: Record<TaskPriority, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      const p = pr[a.priority] - pr[b.priority];
      if (p !== 0) return p;
      return taskOpenSortKey(a) - taskOpenSortKey(b);
    });
    const mit = sortedMit.slice(0, 3);

    const span = TIMELINE_HOUR_COUNT;

    const timelineSorted = [...dueToday, ...doneToday].sort((a, b) => {
      const ak = a.done
        ? new Date(a.dueAt).getTime()
        : taskOpenSortKey(a);
      const bk = b.done
        ? new Date(b.dueAt).getTime()
        : taskOpenSortKey(b);
      return ak - bk;
    });

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
      timelineTasks: timelineSorted,
      hourLabels: labels,
    };
  }, [tasks, nowTs]);

  const timedGridHeightPx =
    hourLabels.length * ROW_HEIGHT_PX + BLOCK_MIN_HEIGHT * 0.25;

  const timelinePlacements = useMemo(
    () =>
      placeTasksOnTimeline(timelineTasks, timedGridHeightPx, nowTs),
    [timelineTasks, timedGridHeightPx, nowTs],
  );

  const timelinePadRef = useRef<HTMLDivElement | null>(null);
  const quickTitleInputRef = useRef<HTMLInputElement>(null);
  const timelineDragSessionRef = useRef<TimelineDragSession | null>(null);
  /** During empty-timeline drag range selection - suppress dashed hover preview. */
  const timelineGridRangeSelectingRef = useRef(false);
  /** Active drag-from–Catch up chip onto timeline (blocks stray timeline hover painting). */
  const catchUpScheduleDragRef = useRef<{ taskId: string } | null>(null);
  const [timelineDrag, setTimelineDrag] = useState<{
    taskId: string;
    topPx: number;
    heightPx: number;
    previewLabel: string;
  } | null>(null);

  const [timelineHover, setTimelineHover] = useState<{
    anchorYpx: number;
    label: string;
  } | null>(null);

  const [catchUpDraggingTaskId, setCatchUpDraggingTaskId] = useState<
    string | null
  >(null);

  const quickMinuteOptions = useMemo(() => quickMinuteChoices(), []);

  useEffect(() => {
    if (timelineDrag !== null) setTimelineHover(null);
  }, [timelineDrag]);

  const paintTimelineHover = useCallback((clientY: number) => {
    const pad = timelinePadRef.current;
    if (
      !pad ||
      timelineDrag !== null ||
      timelineDragSessionRef.current !== null ||
      timelineGridRangeSelectingRef.current ||
      catchUpScheduleDragRef.current !== null
    ) {
      return;
    }
    const metrics = getTimelineSlotInnerBox(pad);
    if (!metrics || metrics.innerHeight <= 0) return;
    const raw = clientY - metrics.innerTopViewport;
    const relYC = Math.min(Math.max(raw, 0), metrics.innerHeight);

    const anchorIso = isoTodayAtHourMinute(12, 0);
    setTimelineHover({
      anchorYpx: relYC,
      label: tentativeTimeLabel(relYC, metrics.innerHeight, anchorIso),
    });
  }, [timelineDrag]);

  const jumpQuickCaptureFromTimeline = useCallback(
    (clientY: number) => {
      if (timelineDrag !== null) return;
      if (catchUpScheduleDragRef.current !== null) return;
      const pad = timelinePadRef.current;
      if (!pad) return;
      const hm = hourMinuteFromPointerInTimeline(clientY, pad);
      if (!hm) return;

      setQuickRangeFromHm(null);
      setQuickHour(hm.hour);
      setQuickMinute(hm.minute);
      setQuickError(null);
      queueMicrotask(() =>
        quickTitleInputRef.current?.focus({ preventScroll: true }),
      );
    },
    [timelineDrag],
  );

  const beginCatchUpScheduleDrag = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, taskId: string) => {
      if (timelineDragSessionRef.current !== null) return;
      if (timelineDrag !== null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.isPrimary === false) return;

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let captureOk = false;
      const el = e.currentTarget;

      const paintCatchUpTimelineHover = (clientX: number, clientY: number) => {
        const pad = timelinePadRef.current;
        if (!pad) return;
        const full = pad.getBoundingClientRect();
        const outside =
          clientX < full.left ||
          clientX > full.right ||
          clientY < full.top ||
          clientY > full.bottom;
        if (outside) {
          setTimelineHover(null);
          return;
        }
        const m = getTimelineSlotInnerBox(pad);
        if (!m || m.innerHeight <= 0) return;
        const raw = clientY - m.innerTopViewport;
        const relYC = Math.min(Math.max(raw, 0), m.innerHeight);
        const task = tasksRef.current.find((x) => x.id === taskId);
        const baseToday = isoTodayAtHourMinute(12, 0);
        const anchorIsoSnapped = dueIsoFromTimelineCenterAndHeight(
          relYC,
          m.innerHeight,
          baseToday,
        );
        let label = formatShortTime(anchorIsoSnapped);
        const rawFrom = task?.scheduledFromAt?.trim();
        if (task && rawFrom) {
          const dur =
            new Date(task.dueAt).getTime() - new Date(rawFrom).getTime();
          if (dur > 0) {
            label = formatTaskScheduleLine({
              scheduledFromAt: anchorIsoSnapped,
              dueAt: new Date(
                new Date(anchorIsoSnapped).getTime() + dur,
              ).toISOString(),
            });
          }
        }
        setTimelineHover({ anchorYpx: relYC, label });
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!dragging && Math.hypot(dx, dy) >= CATCH_UP_DRAG_THRESHOLD_PX) {
          dragging = true;
          catchUpScheduleDragRef.current = { taskId };
          setCatchUpDraggingTaskId(taskId);
          ev.preventDefault();
          try {
            el.setPointerCapture(pointerId);
            captureOk = true;
          } catch {
            /* noop */
          }
        }

        if (!dragging) return;
        paintCatchUpTimelineHover(ev.clientX, ev.clientY);
      };

      const onDone = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onDone);
        window.removeEventListener("pointercancel", onDone);

        try {
          if (captureOk) {
            el.releasePointerCapture(pointerId);
          }
        } catch {
          /* noop */
        }

        catchUpScheduleDragRef.current = null;
        setCatchUpDraggingTaskId(null);
        setTimelineHover(null);

        if (!dragging) {
          setSelectedId(taskId);
          return;
        }

        const pad = timelinePadRef.current;
        if (!pad) return;
        const full = pad.getBoundingClientRect();
        const inside =
          ev.clientX >= full.left &&
          ev.clientX <= full.right &&
          ev.clientY >= full.top &&
          ev.clientY <= full.bottom;
        if (!inside) return;

        const m = getTimelineSlotInnerBox(pad);
        if (!m || m.innerHeight <= 0) return;

        const innerY = innerYFromClientY(ev.clientY, m);
        const anchorIso = dueIsoFromTimelineCenterAndHeight(
          innerY,
          m.innerHeight,
          isoTodayAtHourMinute(12, 0),
        );

        const task = tasksRef.current.find((t) => t.id === taskId);
        if (!task) return;

        const rawFrom = task.scheduledFromAt?.trim();
        if (rawFrom) {
          const dur =
            new Date(task.dueAt).getTime() - new Date(rawFrom).getTime();
          if (dur > 0) {
            updateTask(taskId, {
              scheduledFromAt: anchorIso,
              dueAt: new Date(
                new Date(anchorIso).getTime() + dur,
              ).toISOString(),
            });
          } else {
            updateTask(taskId, {
              scheduledFromAt: null,
              dueAt: anchorIso,
            });
          }
        } else {
          updateTask(taskId, { dueAt: anchorIso });
        }
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onDone);
      window.addEventListener("pointercancel", onDone);
    },
    [setSelectedId, timelineDrag, updateTask],
  );

  const handleTimelineGridPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (timelineDrag !== null) return;
      if (catchUpScheduleDragRef.current !== null) {
        e.preventDefault();
        return;
      }
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.isPrimary === false) return;
      e.preventDefault();

      const pad = timelinePadRef.current;
      if (!pad) return;

      const m = getTimelineSlotInnerBox(pad);
      if (!m || m.innerHeight <= 0) return;

      const startInnerY = innerYFromClientY(e.clientY, m);

      timelineGridRangeSelectingRef.current = true;
      setTimelineHover(null);
      setTimelineRangeDraft({
        topPx: startInnerY,
        heightPx: 2,
      });

      const captureTarget = e.currentTarget;
      const pointerId = e.pointerId;

      let captureOk = false;
      try {
        captureTarget.setPointerCapture(pointerId);
        captureOk = true;
      } catch {
        /* Continue without capture - pointerup still fires on window for mouse/touch. */
      }

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const mm = getTimelineSlotInnerBox(pad);
        if (!mm || mm.innerHeight <= 0) return;

        const cur = innerYFromClientY(ev.clientY, mm);
        const tt = Math.min(startInnerY, cur);
        const hh = Math.max(2, Math.abs(cur - startInnerY));

        setTimelineRangeDraft({
          topPx: tt,
          heightPx: hh,
        });
      };

      const onDone = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onDone);
        window.removeEventListener("pointercancel", onDone);

        try {
          if (captureOk) {
            captureTarget.releasePointerCapture(pointerId);
          }
        } catch {
          /* noop */
        }

        timelineGridRangeSelectingRef.current = false;
        setTimelineRangeDraft(null);

        const mu = getTimelineSlotInnerBox(pad);
        if (!mu || mu.innerHeight <= 0) return;

        const endInner = innerYFromClientY(ev.clientY, mu);
        const delta = Math.abs(endInner - startInnerY);

        if (delta < TIMELINE_RANGE_DRAG_THRESHOLD_PX) {
          jumpQuickCaptureFromTimeline(ev.clientY);
          return;
        }

        const { from, to } = snappedWindowFromInnerRange(
          startInnerY,
          endInner,
          mu.innerHeight,
        );

        setQuickRangeFromHm({ hour: from.hour, minute: from.minute });
        setQuickHour(to.hour);
        setQuickMinute(to.minute);
        setQuickError(null);
        queueMicrotask(() =>
          quickTitleInputRef.current?.focus({ preventScroll: true }),
        );
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onDone);
      window.addEventListener("pointercancel", onDone);
    },
    [jumpQuickCaptureFromTimeline, timelineDrag],
  );

  const startTimelineDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      task: Task,
      placementTopPx: number,
      placementHeightPx: number,
    ) => {
      const gripEl = event.currentTarget;
      const slotEl = timelinePadRef.current;
      const row = gripEl.closest("[data-drag-row]");

      if (!slotEl || !row || !(row instanceof HTMLElement)) return;

      event.preventDefault();

      const rowRect = row.getBoundingClientRect();
      const grabOffsetY = event.clientY - rowRect.top;

      timelineDragSessionRef.current = {
        pointerId: event.pointerId,
        task,
        grabOffsetY,
        lastTopPx: placementTopPx,
        blockHeightPx: placementHeightPx,
      };

      const metricsInitial = getTimelineSlotInnerBox(slotEl);

      setTimelineDrag({
        taskId: task.id,
        topPx: placementTopPx,
        heightPx: placementHeightPx,
        previewLabel: metricsInitial
          ? tentativeWindowPreview(
              placementTopPx,
              placementHeightPx,
              metricsInitial.innerHeight,
              task,
            )
          : formatTaskScheduleLine(task),
      });
      setTimelineHover(null);

      try {
        gripEl.setPointerCapture(event.pointerId);
      } catch {
        /* ignore unsupported capture edge cases */
      }

      const onMove = (ev: PointerEvent) => {
        const sess = timelineDragSessionRef.current;
        if (!sess || ev.pointerId !== sess.pointerId) return;
        const m = getTimelineSlotInnerBox(slotEl);
        if (!m) return;
        const rawTop =
          ev.clientY - m.innerTopViewport - sess.grabOffsetY;
        const topPx = clampTimelineTopForHeight(
          rawTop,
          m.innerHeight,
          sess.blockHeightPx,
        );
        sess.lastTopPx = topPx;

        setTimelineDrag({
          taskId: sess.task.id,
          topPx,
          heightPx: sess.blockHeightPx,
          previewLabel: tentativeWindowPreview(
            sess.lastTopPx,
            sess.blockHeightPx,
            m.innerHeight,
            sess.task,
          ),
        });
      };

      const onUpOrCancel = (ev: PointerEvent) => {
        const sess = timelineDragSessionRef.current;
        if (!sess || ev.pointerId !== sess.pointerId) return;

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUpOrCancel);
        window.removeEventListener("pointercancel", onUpOrCancel);

        timelineDragSessionRef.current = null;
        try {
          gripEl.releasePointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }

        const m = getTimelineSlotInnerBox(slotEl);
        if (!m) {
          setTimelineDrag(null);
          return;
        }

        const rawFrom = sess.task.scheduledFromAt?.trim();

        if (rawFrom) {
          const nextFromIso = dueIsoFromTimelineCenterAndHeight(
            sess.lastTopPx,
            m.innerHeight,
            taskTimelineAnchorIso(sess.task),
          );
          const dur =
            new Date(sess.task.dueAt).getTime() -
            new Date(rawFrom).getTime();
          if (!(dur > 0)) {
            setTimelineDrag(null);
            return;
          }
          const nextToIso = new Date(
            new Date(nextFromIso).getTime() + dur,
          ).toISOString();

          const changed =
            new Date(sess.task.scheduledFromAt!).getTime() !==
              new Date(nextFromIso).getTime() ||
            new Date(sess.task.dueAt).getTime() !==
              new Date(nextToIso).getTime();

          if (changed) {
            updateTask(sess.task.id, {
              scheduledFromAt: nextFromIso,
              dueAt: nextToIso,
            });
          }
        } else {
          const centerYInside =
            sess.lastTopPx + sess.blockHeightPx / 2;
          const nextAnchorIso = dueIsoFromTimelineCenterAndHeight(
            centerYInside,
            m.innerHeight,
            sess.task.dueAt,
          );
          const prevTs = new Date(sess.task.dueAt).getTime();
          const nextTs = new Date(nextAnchorIso).getTime();
          if (nextTs !== prevTs) {
            updateTask(sess.task.id, { dueAt: nextAnchorIso });
          }
        }

        setTimelineDrag(null);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUpOrCancel);
      window.addEventListener("pointercancel", onUpOrCancel);
    },
    [updateTask],
  );

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
      let dueIso = isoTodayAtHourMinute(quickHour, quickMinute);
      if (Number.isNaN(new Date(dueIso).getTime())) {
        setQuickError("Pick a valid time.");
        return;
      }

      let scheduledFromAt: string | null = null;

      if (quickRangeFromHm) {
        const fromIsoRaw = isoTodayAtHourMinute(
          quickRangeFromHm.hour,
          quickRangeFromHm.minute,
        );
        if (Number.isNaN(new Date(fromIsoRaw).getTime())) {
          setQuickError("Pick a valid From time.");
          return;
        }
        const startMs = new Date(fromIsoRaw).getTime();
        const endMs = new Date(dueIso).getTime();
        if (startMs === endMs) {
          scheduledFromAt = fromIsoRaw;
          const stepMs = SCHEDULE_DRAG_SNAP_MINUTES * 60 * 1000;
          dueIso = new Date(endMs + stepMs).toISOString();
        } else if (startMs < endMs) {
          scheduledFromAt = fromIsoRaw;
        } else {
          scheduledFromAt = dueIso;
          dueIso = fromIsoRaw;
        }
      }

      addTask({
        title: trimmed,
        relatedKind: "none",
        relatedId: null,
        ...(scheduledFromAt ? { scheduledFromAt } : {}),
        dueAt: dueIso,
        priority: quickPriority,
        repeatDaily: quickRepeatDaily,
        assignee: "You",
      });
      setQuickTitle("");
      setQuickError(null);
      setQuickRepeatDaily(false);
      setQuickRangeFromHm(null);
      setQuickHour(defaultQuickHour());
      setQuickMinute(0);
    } catch {
      setQuickError("Could not schedule that slot.");
    }
  }, [
    addTask,
    quickHour,
    quickMinute,
    quickPriority,
    quickRangeFromHm,
    quickRepeatDaily,
    quickTitle,
  ]);

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
              open loops (GTD).{" "}
              <span className="text-foreground/85">
                Drag a chip onto the day timeline
              </span>{" "}
              to reschedule it into today&apos;s grid (same snap as grip moves).
            </span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {overdueOpen.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  title="Tap for details · drag onto day timeline to reschedule"
                  onPointerDown={(ev) =>
                    beginCatchUpScheduleDrag(ev, t.id)
                  }
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      setSelectedId(t.id);
                    }
                  }}
                  className={cn(
                    "border-sidebar-border hover:bg-background/80 flex max-w-[260px] cursor-grab items-center gap-2 rounded-none border border-white/[0.08] bg-background/40 px-3 py-2 text-left transition-colors select-none active:cursor-grabbing",
                    catchUpDraggingTaskId === t.id &&
                      "ring-primary/45 opacity-95 ring-1",
                  )}
                >
                  <GripVertical
                    className="text-muted-foreground size-3.5 shrink-0 opacity-70"
                    aria-hidden
                  />
                  <span className="text-foreground min-w-0 flex-1 truncate text-[12px] font-medium">
                    {t.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                    {formatTaskScheduleLine(t)}
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
                Full day{" "}
                <span className="text-foreground/90 tabular-nums">
                  00:00–24:00
                </span>
                .{" "}
                <span className="text-foreground/90">
                  Drag on empty space
                </span>{" "}
                to pick a From–To block (snaps to {SCHEDULE_DRAG_SNAP_MINUTES}{" "}
                min ends). Quick click sets a single end time only. Grip on a
                task reschedules it. Drag{" "}
                <span className="text-foreground/90">
                  Catch up first
                </span>{" "}
                chips here to slot overdue work into today.
              </p>
            </div>
          </header>

          <div className="border-sidebar-border max-h-[92vh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-none border border-white/[0.07] bg-[color-mix(in_oklab,var(--card)_78%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]">
            <div className="flex">
              <div
                className="text-muted-foreground/80 shrink-0 border-r border-white/[0.06] bg-white/[0.02] pt-2 pr-3 pl-2 text-[10px] font-medium tabular-nums"
                style={{ minHeight: timedGridHeightPx }}
              >
                {hourLabels.map((h) => (
                  <div
                    key={h}
                    style={{ height: ROW_HEIGHT_PX }}
                    className="relative flex items-start justify-end pt-1"
                  >
                    <span>
                      {String(h).padStart(2, "0")}
                      :00
                    </span>
                    {h === DAY_END_HOUR ? (
                      <span className="text-muted-foreground/60 absolute right-0 bottom-0 text-[9px] font-medium">
                        24:00
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div
                className="relative min-h-0 min-w-0 flex-1"
                style={{ height: timedGridHeightPx }}
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

                <div
                  ref={timelinePadRef}
                  className="absolute inset-0 px-2 pt-1 pb-2"
                  style={{ zIndex: 10, pointerEvents: "none" }}
                >
                  {timelineHover && !timelineDrag && !timelineRangeDraft ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute right-5 left-5 z-[14] -translate-y-1/2 border-t border-dashed border-white/[0.42]"
                      style={{ top: timelineHover.anchorYpx }}
                    >
                      <span className="border-primary/35 bg-[color-mix(in_oklab,var(--card)_92%,transparent)] text-primary absolute -top-3.5 right-0 border px-2 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur-sm">
                        {timelineHover.label}
                      </span>
                    </div>
                  ) : null}

                  {timelineRangeDraft && timelineDrag === null ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute right-5 left-5 z-[13] rounded-sm border border-primary/45 bg-primary/18"
                      style={{
                        top: timelineRangeDraft.topPx,
                        height: timelineRangeDraft.heightPx,
                      }}
                    />
                  ) : null}

                  <button
                    type="button"
                    aria-label={
                      timelineDrag === null
                        ? "Timeline: drag empty space for a From to To block, or click for a single time - snaps to Quick capture"
                        : undefined
                    }
                    tabIndex={timelineDrag !== null ? -1 : 0}
                    className={cn(
                      "pointer-events-auto absolute inset-x-2 top-1 bottom-2 z-[12] rounded-none bg-transparent outline-none hover:bg-black/[0.025] dark:hover:bg-white/[0.035]",
                      timelineDrag !== null &&
                        "pointer-events-none invisible",
                      "cursor-crosshair transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.07] touch-none",
                      "focus-visible:ring-primary ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color-mix(in_oklab,var(--card)_94%,transparent)]",
                    )}
                    onMouseMove={(e) => paintTimelineHover(e.clientY)}
                    onMouseLeave={() => setTimelineHover(null)}
                    onPointerDown={handleTimelineGridPointerDown}
                  />

                  <div className="pointer-events-none relative z-[20] pt-px">
                    {timelinePlacements.map(({ task, topPx, heightPx }) => {
                      const isDraggingSlot =
                        timelineDrag?.taskId === task.id;
                      const displayTop = isDraggingSlot
                        ? timelineDrag.topPx
                        : topPx;
                      const displayHeightPx =
                        isDraggingSlot && timelineDrag
                          ? timelineDrag.heightPx
                          : heightPx;
                      const windowBlock = isTimelineWindowTask(task);
                      return (
                        <div
                          key={task.id}
                          data-drag-row=""
                          className={cn(
                            "pointer-events-auto absolute right-2 left-2",
                            isDraggingSlot && "z-[50]",
                          )}
                          style={
                            windowBlock
                              ? { top: displayTop, height: displayHeightPx }
                              : { top: displayTop, minHeight: displayHeightPx }
                          }
                        >
                          <TimetableTaskBlock
                            task={task}
                            onToggle={toggleTask}
                            onOpen={() => setSelectedId(task.id)}
                            onGripPointerDown={(e) =>
                              startTimelineDrag(
                                e,
                                task,
                                topPx,
                                heightPx,
                              )
                            }
                            dragging={isDraggingSlot}
                            fillHeight={windowBlock}
                            scheduledTimeDisplay={
                              isDraggingSlot
                                ? timelineDrag.previewLabel
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
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
              Drag on the day timeline for a shaded window linked here, type a
              title, then block it.
            </p>

            <div className="space-y-3">
              <label className="sr-only" htmlFor="today-quick-title">
                Task title
              </label>
              <input
                ref={quickTitleInputRef}
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

              <div className="flex flex-col gap-3">
                {quickRangeFromHm ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                        From
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickRangeFromHm(null)}
                        className="text-primary hover:text-primary/85 text-[9px] font-semibold tracking-wide underline-offset-4 hover:underline"
                      >
                        Clear window → one time
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                          Hour
                        </span>
                        <select
                          value={quickRangeFromHm.hour}
                          onChange={(e) =>
                            setQuickRangeFromHm((prev) => {
                              const base = prev ?? {
                                hour: DAY_START_HOUR,
                                minute: 0,
                              };
                              return {
                                ...base,
                                hour: Number.parseInt(e.target.value, 10),
                              };
                            })
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
                          value={quickRangeFromHm.minute}
                          onChange={(e) =>
                            setQuickRangeFromHm((prev) => {
                              const base = prev ?? {
                                hour: DAY_START_HOUR,
                                minute: 0,
                              };
                              return {
                                ...base,
                                minute: Number.parseInt(e.target.value, 10),
                              };
                            })
                          }
                          className="border-sidebar-border bg-background/80 h-10 min-w-[72px] rounded-none border border-white/[0.08] px-2 text-[12px]"
                        >
                          {quickMinuteOptions.map((mm) => (
                            <option key={mm} value={mm}>
                              :{String(mm).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                      To <span className="text-muted-foreground/75">(end)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                          Hour
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
                          {quickMinuteOptions.map((m) => (
                            <option key={m} value={m}>
                              :{String(m).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                      Due <span className="text-muted-foreground/75">(end)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                          Hour
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
                          {quickMinuteOptions.map((m) => (
                            <option key={m} value={m}>
                              :{String(m).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
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

              <label className="text-muted-foreground flex cursor-pointer items-start gap-3 text-[11px] leading-snug">
                <input
                  type="checkbox"
                  checked={quickRepeatDaily}
                  onChange={(e) =>
                    setQuickRepeatDaily(e.target.checked)
                  }
                  className="border-sidebar-border accent-primary mt-0.5 size-4 shrink-0 rounded-none border border-white/[0.12] bg-transparent"
                />
                <span>
                  <span className="text-foreground font-semibold">
                    Repeat daily
                  </span>
                  <span className="text-muted-foreground block font-normal">
                    {quickRangeFromHm
                      ? "Checked off rolls the From–To window forward one calendar day."
                      : "Checked off bumps this to tomorrow at this time."}
                  </span>
                </span>
              </label>

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
                          {priorityLabel(t.priority)}
                          {t.repeatDaily ? " · daily" : ""} ·{" "}
                          {formatTaskScheduleLine(t)}
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
