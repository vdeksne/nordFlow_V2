"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import {
  filterProjectsInView,
  startOfWeekMonday,
  type ProjectGranularity,
} from "@/lib/crm/project-kanban-buckets";
import { Button } from "@/components/Ui/Button";
import { cn } from "@/lib/utils";

import { AddProjectSheet } from "./AddProjectSheet";
import { CrmPage } from "./CrmPage";
import { DashboardPrioritiesSection } from "./DashboardPriorities";
import { ProjectDetailSheet } from "./ProjectDetailSheet";
import { ProjectsKanban } from "./ProjectsKanban";
import { useProjects } from "./ProjectsContext";

const GRAIN_OPTIONS: { id: ProjectGranularity; label: string; hint: string }[] =
  [
    { id: "year", label: "Year", hint: "12 mo" },
    { id: "month", label: "Month", hint: "Weeks" },
    { id: "week", label: "Week", hint: "7-day" },
    { id: "day", label: "Day", hint: "Hour slots" },
  ];

function formatPeriodLabel(granularity: ProjectGranularity, anchor: Date): string {
  if (granularity === "year") {
    return String(anchor.getFullYear());
  }
  if (granularity === "month") {
    return anchor.toLocaleString("en-GB", { month: "long", year: "numeric" });
  }
  if (granularity === "week") {
    const ws = startOfWeekMonday(anchor);
    const label = ws.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `Week of ${label}`;
  }
  return anchor.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ProjectsPageClient() {
  const { projects } = useProjects();
  const [granularity, setGranularity] =
    useState<ProjectGranularity>("week");
  const [anchor, setAnchor] = useState(() => new Date(2026, 4, 14));
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  const selectedProject = useMemo(
    () =>
      selectedProjectId
        ? (projects.find((p) => p.id === selectedProjectId) ?? null)
        : null,
    [projects, selectedProjectId],
  );

  const visibleCount = useMemo(
    () => filterProjectsInView(projects, granularity, anchor).length,
    [projects, granularity, anchor],
  );

  const shiftAnchor = (dir: -1 | 1) => {
    setAnchor((prev) => {
      const n = new Date(prev);
      if (granularity === "year") {
        n.setFullYear(n.getFullYear() + dir);
      } else if (granularity === "month") {
        n.setMonth(n.getMonth() + dir);
      } else if (granularity === "week") {
        n.setDate(n.getDate() + dir * 7);
      } else {
        n.setDate(n.getDate() + dir);
      }
      return n;
    });
  };

  const jumpToday = () => {
    const t = new Date();
    if (granularity === "year") {
      setAnchor(new Date(t.getFullYear(), 0, 1));
    } else if (granularity === "month") {
      setAnchor(new Date(t.getFullYear(), t.getMonth(), 1));
    } else {
      setAnchor(t);
    }
  };

  return (
    <CrmPage
      title="Projects"
      subtitle={`Calendar kanban · ${visibleCount} card${visibleCount === 1 ? "" : "s"} in this ${granularity} window. Inspired by simple column boards — separate lanes per zoom level.`}
    >
      <div className="dashboard-focus space-y-8 sm:space-y-10">
        <DashboardPrioritiesSection />

        <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {GRAIN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGranularity(opt.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-[12px] font-semibold tracking-tight transition-colors sm:min-w-[108px]",
                  granularity === opt.id
                    ? "border-primary bg-primary/[0.12] text-primary ring-1 ring-primary/25"
                    : "border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_45%,transparent)] text-muted-foreground hover:border-white/[0.14] hover:text-foreground",
                )}
              >
                {opt.label}
                <span className="text-muted-foreground mt-0.5 block text-[10px] font-normal tracking-wide">
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AddProjectSheet />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-white/[0.1]"
              onClick={() => shiftAnchor(-1)}
              aria-label="Previous period"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <div className="border-sidebar-border bg-[color-mix(in_oklab,var(--card)_55%,transparent)] flex min-w-[min(100%,240px)] flex-1 items-center justify-center rounded-xl border border-white/[0.07] px-4 py-2 text-center sm:flex-none">
              <p className="text-foreground text-sm font-semibold tracking-tight">
                {formatPeriodLabel(granularity, anchor)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-white/[0.1]"
              onClick={() => shiftAnchor(1)}
              aria-label="Next period"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="solid"
              size="sm"
              className="rounded-xl"
              onClick={jumpToday}
            >
              Today
            </Button>
          </div>
        </div>

        <ProjectsKanban
          projects={projects}
          granularity={granularity}
          anchor={anchor}
          onOpenProject={(p) => setSelectedProjectId(p.id)}
        />

        <ProjectDetailSheet
          project={selectedProject}
          open={selectedProjectId !== null && selectedProject !== null}
          onOpenChange={(next) => {
            if (!next) setSelectedProjectId(null);
          }}
        />
        </div>
      </div>
    </CrmPage>
  );
}
