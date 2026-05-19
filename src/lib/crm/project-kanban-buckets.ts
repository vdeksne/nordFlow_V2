import type { Project } from "./types";

export type ProjectGranularity = "year" | "month" | "week" | "day";

export type KanbanColumnMeta = {
  id: string;
  title: string;
  subtitle?: string;
};

function parseLocalDate(iso: string): Date {
  const part = iso.split("T")[0] ?? iso;
  const [y, m, d] = part.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Monday-start week containing `d` at local midnight */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dowFromMon = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dowFromMon);
  return x;
}

function weekColumnId(dt: Date): string {
  return `wk-${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

export function kanbanColumns(
  granularity: ProjectGranularity,
  anchor: Date,
): KanbanColumnMeta[] {
  const y = anchor.getFullYear();
  const mo = anchor.getMonth();

  if (granularity === "year") {
    return Array.from({ length: 12 }, (_, i) => ({
      id: `y-${y}-m${i}`,
      title: new Date(y, i, 1).toLocaleString("en-GB", { month: "short" }),
      subtitle: new Date(y, i, 1).toLocaleString("en-GB", { month: "long" }),
    }));
  }

  if (granularity === "month") {
    const dim = new Date(y, mo + 1, 0).getDate();
    const numWeeks = Math.ceil(dim / 7);
    return Array.from({ length: numWeeks }, (_, i) => {
      const start = i * 7 + 1;
      const end = Math.min(dim, (i + 1) * 7);
      return {
        id: `mo-${y}-${mo}-w${i + 1}`,
        title: `Week ${i + 1}`,
        subtitle: `${start}-${end}`,
      };
    });
  }

  if (granularity === "week") {
    const ws = startOfWeekMonday(anchor);
    const titles = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return titles.map((title, i) => {
      const colDate = new Date(ws);
      colDate.setDate(ws.getDate() + i);
      return {
        id: weekColumnId(colDate),
        title,
        subtitle: `${colDate.getDate()} ${colDate.toLocaleString("en-GB", {
          month: "short",
        })}`,
      };
    });
  }

  return [
    {
      id: "day-none",
      title: "Unscheduled",
      subtitle: "No focus hour",
    },
    {
      id: "day-e",
      title: "Early",
      subtitle: "6-10",
    },
    {
      id: "day-m",
      title: "Morning",
      subtitle: "10-13",
    },
    {
      id: "day-a",
      title: "Afternoon",
      subtitle: "13-17",
    },
    {
      id: "day-ev",
      title: "Evening",
      subtitle: "17-22",
    },
    {
      id: "day-flex",
      title: "Off-hours",
      subtitle: "Elsewhere",
    },
  ];
}

/** Which column this project belongs to for the focused period - null if outside range */
export function projectColumnId(
  project: Project,
  granularity: ProjectGranularity,
  anchor: Date,
): string | null {
  const pd = parseLocalDate(project.scheduledStart);
  const y = anchor.getFullYear();
  const mo = anchor.getMonth();

  if (granularity === "year") {
    if (pd.getFullYear() !== y) return null;
    return `y-${y}-m${pd.getMonth()}`;
  }

  if (granularity === "month") {
    if (pd.getFullYear() !== y || pd.getMonth() !== mo) return null;
    const week = Math.ceil(pd.getDate() / 7);
    return `mo-${y}-${mo}-w${week}`;
  }

  if (granularity === "week") {
    const ws = startOfWeekMonday(anchor);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    we.setHours(23, 59, 59, 999);
    if (pd < ws || pd > we) return null;
    const idx = (pd.getDay() + 6) % 7;
    const colDate = new Date(ws);
    colDate.setDate(ws.getDate() + idx);
    return weekColumnId(colDate);
  }

  if (!sameCalendarDay(pd, anchor)) return null;
  const h = project.scheduledHour;
  if (h == null) return "day-none";
  if (h < 6 || h >= 22) return "day-flex";
  if (h < 10) return "day-e";
  if (h < 13) return "day-m";
  if (h < 17) return "day-a";
  return "day-ev";
}

export function filterProjectsInView(
  projects: Project[],
  granularity: ProjectGranularity,
  anchor: Date,
): Project[] {
  return projects.filter((p) => projectColumnId(p, granularity, anchor) !== null);
}
