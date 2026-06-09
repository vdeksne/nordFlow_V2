export type WorkoutTypeId =
  | "gym"
  | "run"
  | "rollerblade"
  | "swim"
  | "bike"
  | "walk"
  | "hike"
  | "dance";

export type WorkoutType = {
  id: WorkoutTypeId;
  name: string;
  tag: string;
  accent: string;
  chip: string;
  dot: string;
};

export const WORKOUT_TYPES: WorkoutType[] = [
  {
    id: "gym",
    name: "Gym",
    tag: "Strength",
    accent: "from-violet-500/25 via-transparent to-transparent",
    chip: "border-violet-400/35 bg-violet-500/12 text-violet-100/95",
    dot: "bg-violet-400",
  },
  {
    id: "run",
    name: "Run",
    tag: "Cardio",
    accent: "from-orange-500/25 via-transparent to-transparent",
    chip: "border-orange-400/35 bg-orange-500/12 text-orange-100/95",
    dot: "bg-orange-400",
  },
  {
    id: "rollerblade",
    name: "Rollerblade",
    tag: "Glide",
    accent: "from-pink-500/25 via-transparent to-transparent",
    chip: "border-pink-400/35 bg-pink-500/12 text-pink-100/95",
    dot: "bg-pink-400",
  },
  {
    id: "swim",
    name: "Swim",
    tag: "Pool",
    accent: "from-cyan-500/25 via-transparent to-transparent",
    chip: "border-cyan-400/35 bg-cyan-500/12 text-cyan-100/95",
    dot: "bg-cyan-400",
  },
  {
    id: "bike",
    name: "Bike",
    tag: "Ride",
    accent: "from-lime-500/25 via-transparent to-transparent",
    chip: "border-lime-400/35 bg-lime-500/12 text-lime-100/95",
    dot: "bg-lime-400",
  },
  {
    id: "walk",
    name: "Walk",
    tag: "Easy",
    accent: "from-emerald-500/20 via-transparent to-transparent",
    chip: "border-emerald-400/35 bg-emerald-500/12 text-emerald-100/95",
    dot: "bg-emerald-400",
  },
  {
    id: "hike",
    name: "Hike",
    tag: "Trail",
    accent: "from-amber-500/25 via-transparent to-transparent",
    chip: "border-amber-400/35 bg-amber-500/12 text-amber-100/95",
    dot: "bg-amber-400",
  },
  {
    id: "dance",
    name: "Dance",
    tag: "Flow",
    accent: "from-fuchsia-500/25 via-transparent to-transparent",
    chip: "border-fuchsia-400/35 bg-fuchsia-500/12 text-fuchsia-100/95",
    dot: "bg-fuchsia-400",
  },
];

export const ALL_WORKOUT_IDS: WorkoutTypeId[] = WORKOUT_TYPES.map((w) => w.id);

export type WorkoutDayEntry = {
  workoutId: WorkoutTypeId;
  done: boolean;
};

export type WorkoutPlanState = {
  days: Record<string, WorkoutDayEntry[]>;
};

export function workoutTypeMeta(id: WorkoutTypeId): WorkoutType {
  return WORKOUT_TYPES.find((w) => w.id === id)!;
}

export function localDateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Monday-start week containing `anchor`. */
export function startOfWeekMonday(anchor: Date): Date {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function weekDaysFrom(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function monthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: last.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function defaultWorkoutPlanState(): WorkoutPlanState {
  return { days: {} };
}

export function normalizeWorkoutPlan(raw: unknown): WorkoutPlanState {
  const base = defaultWorkoutPlanState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<WorkoutPlanState>;
  if (!o.days || typeof o.days !== "object") return base;

  const valid = new Set(ALL_WORKOUT_IDS);
  const days: Record<string, WorkoutDayEntry[]> = {};

  for (const [dateKey, entries] of Object.entries(o.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Array.isArray(entries)) continue;
    const normalized: WorkoutDayEntry[] = [];
    const seen = new Set<WorkoutTypeId>();
    for (const row of entries) {
      if (!row || typeof row !== "object") continue;
      const e = row as Partial<WorkoutDayEntry>;
      if (
        typeof e.workoutId !== "string" ||
        !valid.has(e.workoutId as WorkoutTypeId) ||
        seen.has(e.workoutId as WorkoutTypeId)
      ) {
        continue;
      }
      seen.add(e.workoutId as WorkoutTypeId);
      normalized.push({
        workoutId: e.workoutId as WorkoutTypeId,
        done: Boolean(e.done),
      });
    }
    if (normalized.length > 0) days[dateKey] = normalized;
  }

  return { days };
}

export function getDayEntries(
  state: WorkoutPlanState,
  dateKey: string,
): WorkoutDayEntry[] {
  return state.days[dateKey] ?? [];
}

export function countInRange(
  state: WorkoutPlanState,
  fromKey: string,
  toKey: string,
): { planned: number; done: number } {
  let planned = 0;
  let done = 0;
  for (const [key, entries] of Object.entries(state.days)) {
    if (key < fromKey || key > toKey) continue;
    planned += entries.length;
    done += entries.filter((e) => e.done).length;
  }
  return { planned, done };
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
