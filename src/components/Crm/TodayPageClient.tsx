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

const TIMELINE_BLOCK_EST_HEIGHT_PX = 52;
const TIMELINE_BLOCK_MIN_GAP_PX = 4;
/** Snap reschedule targets to multiples of N minutes inside the timeline. */
const SCHEDULE_DRAG_SNAP_MINUTES = 10;

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
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  const d = new Date(baseDueIso);
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
};

function tentativeTimeLabel(
  centerYInsideSlot: number,
  slotInnerHeightPx: number,
  baseDueIso: string,
): string {
  if (slotInnerHeightPx <= 0) return "—";
  const ts = dueIsoFromTimelineCenterAndHeight(
    centerYInsideSlot,
    slotInnerHeightPx,
    baseDueIso,
  );
  return formatShortTime(ts);
}

function tentativeWindowPreview(
  centerYInsideSlot: number,
  slotInnerHeightPx: number,
  task: Task,
): string {
  if (slotInnerHeightPx <= 0) return "—";
  const baseIso = taskTimelineAnchorIso(task);
  const nextAnchorIso = dueIsoFromTimelineCenterAndHeight(
    centerYInsideSlot,
    slotInnerHeightPx,
    baseIso,
  );
  const rawFrom = task.scheduledFromAt?.trim();
  if (!rawFrom) {
    return formatShortTime(nextAnchorIso);
  }
  const dur =
    new Date(task.dueAt).getTime() - new Date(rawFrom).getTime();
  if (!(dur > 0)) {
    return formatShortTime(nextAnchorIso);
  }
  const nextToIso = new Date(
    new Date(nextAnchorIso).getTime() + dur,
  ).toISOString();
  return formatTaskScheduleLine({
    scheduledFromAt: nextAnchorIso,
    dueAt: nextToIso,
  });
}

function clampTimelineTop(topPxCandidate: number, innerHeightPx: number): number {
  const min = TIMELINE_BLOCK_MIN_GAP_PX;
  const max =
    innerHeightPx -
    TIMELINE_BLOCK_EST_HEIGHT_PX -
    TIMELINE_BLOCK_MIN_GAP_PX;
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
  const innerHeight = el.clientHeight - pt - pb;
  return {
    innerTopViewport: rect.top + pt,
    innerHeight: Math.max(0, innerHeight),
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

function taskTimelineAnchorIso(
  task: Pick<Task, "dueAt" | "scheduledFromAt">,
): string {
  const f = task.scheduledFromAt?.trim();
  return f ?? task.dueAt;
}

type TimelinePlacement = { task: Task; topPx: number };

function placeTasksOnTimeline(
  tasks: Task[],
  gridHeightPx: number,
): TimelinePlacement[] {
  const sorted = [...tasks].sort(
    (a, b) => taskOpenSortKey(a) - taskOpenSortKey(b),
  );

  let prevBottom = -1;
  const out: TimelinePlacement[] = [];

  for (const task of sorted) {
    const center = (dueTopPct(taskTimelineAnchorIso(task)) / 100) * gridHeightPx;
    let topPx = center - TIMELINE_BLOCK_EST_HEIGHT_PX / 2;
    topPx = Math.max(
      TIMELINE_BLOCK_MIN_GAP_PX,
      Math.min(
        gridHeightPx - TIMELINE_BLOCK_EST_HEIGHT_PX - TIMELINE_BLOCK_MIN_GAP_PX,
        topPx,
      ),
    );
    if (prevBottom >= 0 && topPx < prevBottom + TIMELINE_BLOCK_MIN_GAP_PX) {
      topPx = prevBottom + TIMELINE_BLOCK_MIN_GAP_PX;
      topPx = Math.min(
        gridHeightPx - TIMELINE_BLOCK_EST_HEIGHT_PX - TIMELINE_BLOCK_MIN_GAP_PX,
        topPx,
      );
    }
    prevBottom = topPx + TIMELINE_BLOCK_EST_HEIGHT_PX;
    out.push({ task, topPx });
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
}: {
  task: Task;
  onToggle: (id: string) => void;
  onOpen: () => void;
  /** Grip control: drag up/down on the timeline to move the scheduled time. */
  onGripPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  dragging?: boolean;
  /** During drag overlay: shown instead of parsing task.dueAt for the badge. */
  scheduledTimeDisplay?: string;
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
        "relative flex min-h-[38px] cursor-pointer gap-1.5 rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_90%,transparent)] p-2.5 text-left backdrop-blur-sm transition-[border-color,box-shadow,opacity] hover:border-white/[0.14]",
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
            "relative z-[1] flex h-11 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-none border border-transparent text-muted-foreground transition-colors hover:border-white/[0.1] hover:text-foreground active:cursor-grabbing",
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
              ? "Finish today — reschedule for tomorrow at the same time"
              : "Mark as done"
        }
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
  const { tasks, addTask, toggleTask, updateTask } = useTasks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nowTs = useNowMinute();

  const [quickTitle, setQuickTitle] = useState("");
  const [quickHour, setQuickHour] = useState(defaultQuickHour);
  const [quickMinute, setQuickMinute] = useState(0);
  const [quickPriority, setQuickPriority] =
    useState<TaskPriority>("medium");
  const [quickRepeatDaily, setQuickRepeatDaily] = useState(false);
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

    const span = DAY_END_HOUR - DAY_START_HOUR + 1;

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

  const gridBodyHeight =
    hourLabels.length * ROW_HEIGHT_PX + BLOCK_MIN_HEIGHT * 0.25;

  const timelinePlacements = useMemo(
    () => placeTasksOnTimeline(timelineTasks, gridBodyHeight),
    [timelineTasks, gridBodyHeight],
  );

  const timelinePadRef = useRef<HTMLDivElement | null>(null);
  const quickTitleInputRef = useRef<HTMLInputElement>(null);
  const timelineDragSessionRef = useRef<TimelineDragSession | null>(null);
  const [timelineDrag, setTimelineDrag] = useState<{
    taskId: string;
    topPx: number;
    previewLabel: string;
  } | null>(null);

  const [timelineHover, setTimelineHover] = useState<{
    anchorYpx: number;
    label: string;
  } | null>(null);

  const quickMinuteOptions = useMemo(() => quickMinuteChoices(), []);

  useEffect(() => {
    if (timelineDrag !== null) setTimelineHover(null);
  }, [timelineDrag]);

  const paintTimelineHover = useCallback((clientY: number) => {
    const pad = timelinePadRef.current;
    if (!pad || timelineDrag !== null || timelineDragSessionRef.current !== null) {
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
      const pad = timelinePadRef.current;
      if (!pad) return;
      const hm = hourMinuteFromPointerInTimeline(clientY, pad);
      if (!hm) return;

      setQuickHour(hm.hour);
      setQuickMinute(hm.minute);
      setQuickError(null);
      queueMicrotask(() =>
        quickTitleInputRef.current?.focus({ preventScroll: true }),
      );
    },
    [timelineDrag],
  );

  const startTimelineDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      task: Task,
      placementTopPx: number,
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
      };

      const metricsInitial = getTimelineSlotInnerBox(slotEl);
      const centerPreview =
        placementTopPx + TIMELINE_BLOCK_EST_HEIGHT_PX / 2;

      setTimelineDrag({
        taskId: task.id,
        topPx: placementTopPx,
        previewLabel: metricsInitial
          ? tentativeWindowPreview(
              centerPreview,
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
        const topPx = clampTimelineTop(rawTop, m.innerHeight);
        sess.lastTopPx = topPx;
        const centerYInside = topPx + TIMELINE_BLOCK_EST_HEIGHT_PX / 2;

        setTimelineDrag({
          taskId: sess.task.id,
          topPx,
          previewLabel: tentativeWindowPreview(
            centerYInside,
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

        const centerYInside =
          sess.lastTopPx + TIMELINE_BLOCK_EST_HEIGHT_PX / 2;
        const baseIso = taskTimelineAnchorIso(sess.task);
        const nextAnchorIso = dueIsoFromTimelineCenterAndHeight(
          centerYInside,
          m.innerHeight,
          baseIso,
        );

        const rawFrom = sess.task.scheduledFromAt?.trim();

        if (rawFrom) {
          const dur =
            new Date(sess.task.dueAt).getTime() -
            new Date(rawFrom).getTime();
          if (!(dur > 0)) {
            setTimelineDrag(null);
            return;
          }
          const nextToIso = new Date(
            new Date(nextAnchorIso).getTime() + dur,
          ).toISOString();

          const changed =
            new Date(sess.task.scheduledFromAt!).getTime() !==
              new Date(nextAnchorIso).getTime() ||
            new Date(sess.task.dueAt).getTime() !==
              new Date(nextToIso).getTime();

          if (changed) {
            updateTask(sess.task.id, {
              scheduledFromAt: nextAnchorIso,
              dueAt: nextToIso,
            });
          }
        } else {
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
        repeatDaily: quickRepeatDaily,
        assignee: "You",
      });
      setQuickTitle("");
      setQuickError(null);
      setQuickRepeatDaily(false);
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
                Drag by the grip to reschedule. Click empty space to set Quick
                Capture start time (snap: {SCHEDULE_DRAG_SNAP_MINUTES}&nbsp;min).
                Move the mouse to preview the snapped time.
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

                <div
                  ref={timelinePadRef}
                  className="pointer-events-none absolute inset-0 px-2 pt-1 pb-2"
                  style={{ zIndex: 10 }}
                >
                  {timelineHover && !timelineDrag ? (
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

                  <button
                    type="button"
                    aria-label={
                      timelineDrag === null
                        ? "Pick a time slot for Quick Capture — click anywhere on this grid"
                        : undefined
                    }
                    tabIndex={timelineDrag !== null ? -1 : 0}
                    className={cn(
                      "absolute inset-x-2 top-1 bottom-2 z-[12] rounded-none bg-transparent outline-none hover:bg-black/[0.025] dark:hover:bg-white/[0.035]",
                      timelineDrag !== null &&
                        "pointer-events-none invisible",
                      "cursor-crosshair transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.07]",
                      "focus-visible:ring-primary ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color-mix(in_oklab,var(--card)_94%,transparent)]",
                    )}
                    onMouseMove={(e) => paintTimelineHover(e.clientY)}
                    onMouseLeave={() => setTimelineHover(null)}
                    onClick={(e) => {
                      e.preventDefault();
                      jumpQuickCaptureFromTimeline(e.clientY);
                    }}
                  />

                  <div className="pointer-events-none relative z-[20] pt-px">
                    {timelinePlacements.map(({ task, topPx }) => {
                      const isDraggingSlot =
                        timelineDrag?.taskId === task.id;
                      const displayTop = isDraggingSlot
                        ? timelineDrag.topPx
                        : topPx;
                      return (
                        <div
                          key={task.id}
                          data-drag-row=""
                          className={cn(
                            "pointer-events-auto absolute right-2 left-2",
                            isDraggingSlot && "z-[50]",
                          )}
                          style={{ top: displayTop }}
                        >
                          <TimetableTaskBlock
                            task={task}
                            onToggle={toggleTask}
                            onOpen={() => setSelectedId(task.id)}
                            onGripPointerDown={(e) =>
                              startTimelineDrag(e, task, topPx)
                            }
                            dragging={isDraggingSlot}
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
              Brain dump → scheduled commitment. Defaults keep friction near
              zero (Zeigarnik effect).
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
                    {quickMinuteOptions.map((m) => (
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
                    Checked off bumps this to tomorrow at this time.
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
