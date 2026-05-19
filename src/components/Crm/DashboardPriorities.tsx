"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Flame,
  Layers,
  Target,
  Zap,
} from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/Ui/Badge";
import { buttonVariants } from "@/components/Ui/Button";
import { formatTaskRelatedLine } from "@/lib/crm/task-related-label";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/lib/crm/types";

import { useCompanies } from "./CompaniesContext";
import { useContacts } from "./ContactsContext";
import { useDeals } from "./DealsContext";
import { useGoals } from "./GoalsContext";
import { useLeads } from "./LeadsContext";
import { formatTaskScheduleLine, taskOpenSortKey } from "./TaskFormShared";
import { useTasks } from "./TasksContext";

function priorityWeight(p: TaskPriority): number {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

function priorityStyles(p: TaskPriority): {
  label: string;
  dotClass: string;
  pillClass: string;
} {
  switch (p) {
    case "high":
      return {
        label: "High",
        dotClass: "bg-rose-400",
        pillClass:
          "border-rose-400/35 bg-rose-500/12 text-rose-200/95",
      };
    case "medium":
      return {
        label: "Medium",
        dotClass: "bg-amber-400",
        pillClass:
          "border-amber-400/30 bg-amber-500/10 text-amber-100/90",
      };
    default:
      return {
        label: "Low",
        dotClass: "bg-slate-500",
        pillClass: "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
      };
  }
}

function sortOpenTasks(tasks: Task[]): Task[] {
  const open = tasks.filter((t) => !t.done);
  return [...open].sort((a, b) => {
    const pw = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (pw !== 0) return pw;
    return taskOpenSortKey(a) - taskOpenSortKey(b);
  });
}

function SpotlightCard({
  task,
  rank,
}: {
  task: Task;
  rank: number;
}) {
  const ps = priorityStyles(task.priority);
  const labels = ["Anchor first", "Then this", "If there is still room"] as const;
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

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] p-5 backdrop-blur-md transition-[border-color] duration-300",
        "hover:border-white/[0.12]",
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent font-mono text-lg font-bold tabular-nums text-primary ring-1 ring-primary/30",
              rank === 1 && "from-primary/35 ring-primary/40",
            )}
            aria-hidden
          >
            {String(rank).padStart(2, "0")}
          </span>
          <div>
            <p className="text-primary text-[10px] font-bold tracking-[0.22em] uppercase">
              {labels[rank - 1]}
            </p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums">
              <Calendar className="size-3 opacity-70" aria-hidden />
              {formatTaskScheduleLine(task)}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            ps.pillClass,
          )}
        >
          <span
            className={cn(
              "mr-1.5 inline-block size-1.5 rounded-full",
              ps.dotClass,
            )}
          />
          {ps.label}
        </Badge>
      </div>
      <h3 className="relative mt-4 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[17px]">
        {task.title}
      </h3>
      <p className="text-muted-foreground relative mt-2 line-clamp-1 text-xs">
        {relatedLine}
      </p>
      <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-muted-foreground">
        <span className="truncate">{task.assignee}</span>
        <Zap className="size-3.5 shrink-0 text-primary/80 opacity-80" aria-hidden />
      </div>
    </article>
  );
}

function RunnerRow({ task, index }: { task: Task; index: number }) {
  const ps = priorityStyles(task.priority);
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

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-none border border-white/[0.05] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] px-3 py-3 backdrop-blur-sm transition-colors hover:bg-[color-mix(in_oklab,var(--card)_72%,transparent)]",
      )}
    >
      <span className="text-muted-foreground/80 mt-0.5 font-mono text-[11px] font-semibold tabular-nums">
        {String(index + 4).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
              ps.pillClass,
            )}
          >
            {ps.label}
          </span>
          <span className="tabular-nums">{formatTaskScheduleLine(task)}</span>
          <span className="max-w-[min(100%,14rem)] truncate" title={relatedLine}>
            · {relatedLine}
          </span>
          <span className="truncate">· {task.assignee}</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardPrioritiesSection() {
  const { tasks } = useTasks();

  const ranked = useMemo(() => sortOpenTasks(tasks).slice(0, 7), [tasks]);
  const spotlight = ranked.slice(0, 3);
  const runners = ranked.slice(3, 7);

  return (
    <section
      className="relative overflow-hidden rounded-none border border-white/[0.05] bg-[color-mix(in_oklab,var(--card)_62%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] backdrop-blur-xl"
      aria-labelledby="dashboard-priorities-heading"
    >
      <div className="relative border-b border-white/[0.05] px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-none px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase ring-1 ring-primary/18">
                <Target className="size-3.5" aria-hidden />
                Today&apos;s orbit
              </span>
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
                Top three anchors · seven max before overwhelm
              </span>
            </div>
            <h2
              id="dashboard-priorities-heading"
              className="text-foreground max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl sm:leading-tight"
            >
              Three moves worth your real attention
            </h2>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed sm:text-[15px]">
              Tasks ranked by urgency, linked to CRM or goals—keep the sprint
              small so life outside the sprint still exists. Tie work to outcomes
              you actually care about, not just adrenaline.
            </p>
          </div>
          <Link
            href="/tasks"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-1.5",
            )}
          >
            Full list
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        {ranked.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="bg-primary/12 text-primary flex size-14 items-center justify-center rounded-none ring-1 ring-primary/25">
              <Layers className="size-7" aria-hidden />
            </div>
            <p className="text-lg font-semibold tracking-tight">
              Clear runway on purpose
            </p>
            <p className="text-muted-foreground max-w-sm text-sm">
              No open tasks—or nothing logged yet. Add what matters so this board
              reflects your real commitments, work and beyond.
            </p>
            <Link
              href="/tasks"
              className={cn(buttonVariants({ variant: "solid", size: "lg" }), "mt-2 gap-1.5")}
            >
              Open tasks
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <Flame className="size-4 text-rose-400/90" aria-hidden />
              <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                Front three
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {spotlight.map((task, i) => (
                <SpotlightCard key={task.id} task={task} rank={i + 1} />
              ))}
              {spotlight.length < 3
                ? Array.from({ length: 3 - spotlight.length }).map((_, i) => (
                    <div
                      key={`placeholder-${i}`}
                      className="flex min-h-[200px] flex-col items-center justify-center rounded-none border border-dashed border-white/[0.08] bg-white/[0.02] px-4 text-center"
                    >
                      <p className="text-muted-foreground text-sm font-medium">
                        Open slot — space on purpose?
                      </p>
                      <p className="text-muted-foreground/70 mt-1 text-xs">
                        Guard it for rest—or add something meaningful before the
                        void fills itself.
                      </p>
                    </div>
                  ))
                : null}
            </div>

            {runners.length > 0 ? (
              <>
                <div className="mt-10 mb-3 flex items-center gap-2">
                  <Layers className="text-muted-foreground size-4" aria-hidden />
                  <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Also on deck ({runners.length})
                  </span>
                </div>
                <ul className="grid list-none gap-2 p-0 sm:grid-cols-2">
                  {runners.map((task, i) => (
                    <li key={task.id}>
                      <RunnerRow task={task} index={i} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
