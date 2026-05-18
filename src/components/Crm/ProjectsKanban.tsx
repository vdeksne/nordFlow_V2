"use client";

import { useMemo } from "react";

import type { Project } from "@/lib/crm/types";
import {
  kanbanColumns,
  projectColumnId,
  type ProjectGranularity,
} from "@/lib/crm/project-kanban-buckets";
import { cn } from "@/lib/utils";

function statusStyles(status: Project["status"]) {
  switch (status) {
    case "done":
      return "border-emerald-400/25 bg-emerald-500/[0.07] text-emerald-200/95";
    case "blocked":
      return "border-rose-400/25 bg-rose-500/[0.08] text-rose-100/90";
    case "active":
      return "border-primary/30 bg-primary/[0.08] text-primary";
    default:
      return "border-white/[0.08] bg-white/[0.03] text-muted-foreground";
  }
}

export function ProjectsKanban({
  projects,
  granularity,
  anchor,
  onOpenProject,
}: {
  projects: Project[];
  granularity: ProjectGranularity;
  anchor: Date;
  onOpenProject?: (project: Project) => void;
}) {
  const columns = useMemo(
    () => kanbanColumns(granularity, anchor),
    [granularity, anchor],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const c of columns) map.set(c.id, []);
    for (const p of projects) {
      const cid = projectColumnId(p, granularity, anchor);
      if (!cid || !map.has(cid)) continue;
      map.get(cid)!.push(p);
    }
    return map;
  }, [projects, columns, granularity, anchor]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-5">
      {columns.map((col) => (
        <section
          key={col.id}
          className="flex w-[min(100%,272px)] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[color-mix(in_oklab,var(--muted)_55%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] scroll-smooth md:w-[264px]"
        >
          <header className="border-b border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_35%,transparent)] px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-foreground truncate text-[13px] font-semibold tracking-tight">
                  {col.title}
                </h3>
                {col.subtitle ? (
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {col.subtitle}
                  </p>
                ) : null}
              </div>
              <span className="bg-background/85 text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-white/[0.07]">
                {grouped.get(col.id)?.length ?? 0}
              </span>
            </div>
          </header>
          <div className="flex min-h-[140px] flex-col gap-2.5 p-2.5">
            {(grouped.get(col.id) ?? []).length === 0 ? (
              <div className="text-muted-foreground/55 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.07] px-3 py-10 text-center text-[11px] leading-relaxed">
                Nothing scheduled here
              </div>
            ) : (
              (grouped.get(col.id) ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rounded-lg border border-white/[0.07] bg-[color-mix(in_oklab,var(--card)_93%,transparent)] p-3 text-left shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05)] transition-[border-color] duration-200 hover:border-primary/25"
                  onClick={() => onOpenProject?.(p)}
                  aria-label={`Open project ${p.title}`}
                >
                  <p className="text-muted-foreground mb-1 truncate text-[10px] font-semibold tracking-[0.14em] uppercase">
                    {p.company}
                  </p>
                  <h4 className="text-foreground text-[13px] leading-snug font-semibold tracking-tight">
                    {p.title}
                  </h4>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                        statusStyles(p.status),
                      )}
                    >
                      {p.status}
                    </span>
                    <span className="text-muted-foreground truncate text-[10px]">
                      {p.owner}
                    </span>
                  </div>
                  <p className="text-muted-foreground/85 mt-2 text-[10px] tabular-nums tracking-wide">
                    {p.scheduledStart}
                    {p.scheduledHour != null
                      ? ` · ${String(p.scheduledHour).padStart(2, "0")}:00`
                      : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
