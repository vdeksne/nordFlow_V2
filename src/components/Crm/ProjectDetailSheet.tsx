"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/Ui/Sheet";
import type { Project, ProjectStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { useDeals } from "./DealsContext";
import { useProjects } from "./ProjectsContext";

type ProjectDetailSheetProps = {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string; hint: string }[] =
  [
    { value: "planned", label: "Planned", hint: "Not started" },
    { value: "active", label: "Active", hint: "In progress" },
    { value: "blocked", label: "Blocked", hint: "Waiting" },
    { value: "done", label: "Done", hint: "Shipped" },
  ];

export function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
}: ProjectDetailSheetProps) {
  const { updateProject, deleteProject } = useProjects();
  const { deals } = useDeals();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledHour, setScheduledHour] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planned");
  const [owner, setOwner] = useState("");
  const [dealId, setDealId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    queueMicrotask(() => {
      setTitle(project.title);
      setCompany(project.company);
      setScheduledStart(project.scheduledStart);
      setScheduledHour(
        project.scheduledHour != null ? String(project.scheduledHour) : "",
      );
      setStatus(project.status);
      setOwner(project.owner === "You" ? "" : project.owner);
      setDealId(project.dealId ?? "");
      setError(null);
      setDeleteStep(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset draft when switching opened row
  }, [open, project?.id]);

  const handleSave = useCallback(() => {
    if (!project) return;
    const trimmedTitle = title.trim();
    const trimmedCo = company.trim();
    if (!trimmedTitle) {
      setError("Project title is required.");
      return;
    }
    if (!trimmedCo) {
      setError("Company is required.");
      return;
    }
    const hourRaw = scheduledHour.trim();
    let scheduledHourNum: number | null = null;
    if (hourRaw !== "") {
      const h = Number(hourRaw);
      if (!Number.isFinite(h) || h < 0 || h > 23) {
        setError("Hour must be empty or between 0 and 23.");
        return;
      }
      scheduledHourNum = Math.floor(h);
    }

    updateProject(project.id, {
      title: trimmedTitle,
      company: trimmedCo,
      scheduledStart,
      scheduledHour: scheduledHourNum,
      status,
      owner: owner.trim() || "You",
      dealId: dealId ? dealId : null,
    });
    setError(null);
    onOpenChange(false);
  }, [
    company,
    dealId,
    onOpenChange,
    owner,
    project,
    scheduledHour,
    scheduledStart,
    status,
    title,
    updateProject,
  ]);

  const handleDelete = useCallback(() => {
    if (!project) return;
    deleteProject(project.id);
    setDeleteStep(false);
    onOpenChange(false);
  }, [deleteProject, onOpenChange, project]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-card/95 flex h-full w-full max-w-[min(100vw,480px)] flex-col gap-0 border-white/[0.08] backdrop-blur-xl sm:max-w-lg"
      >
        {project ? (
          <>
            <SheetHeader className="border-b border-white/[0.06] px-6 pb-4 pt-4 text-left">
              <SheetTitle className="text-foreground text-lg font-semibold tracking-tight">
                {title.trim() || "Project"}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-sm leading-relaxed">
                Edit scheduling, status, or remove this card from the board.
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <label
                  htmlFor="detail-project-title"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Title
                </label>
                <Input
                  id="detail-project-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="detail-project-company"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Company
                </label>
                <Input
                  id="detail-project-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="detail-project-start"
                    className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                  >
                    Start date
                  </label>
                  <Input
                    id="detail-project-start"
                    type="date"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="detail-project-hour"
                    className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                  >
                    Hour (0–23)
                  </label>
                  <Input
                    id="detail-project-hour"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={23}
                    value={scheduledHour}
                    onChange={(e) => setScheduledHour(e.target.value)}
                    placeholder="Optional"
                    className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                  Status
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-[11px] font-semibold tracking-tight transition-colors",
                        status === opt.value
                          ? "border-primary bg-primary/[0.12] text-primary ring-1 ring-primary/25"
                          : "border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_45%,transparent)] text-muted-foreground hover:border-white/[0.14] hover:text-foreground",
                      )}
                    >
                      {opt.label}
                      <span className="text-muted-foreground mt-0.5 block text-[10px] font-normal">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="detail-project-owner"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Owner
                </label>
                <Input
                  id="detail-project-owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Defaults to You"
                  className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="detail-project-deal"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Linked deal
                </label>
                <select
                  id="detail-project-deal"
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  className="border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                {deleteStep ? (
                  <div className="bg-destructive/10 space-y-3 rounded-xl border border-destructive/25 p-4">
                    <p className="text-destructive text-sm font-medium">
                      Delete this project permanently?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="rounded-xl"
                        onClick={handleDelete}
                      >
                        Yes, delete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-white/[0.1]"
                        onClick={() => setDeleteStep(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteStep(true)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete project
                  </Button>
                )}
              </div>
            </div>

            {error ? (
              <p className="text-destructive shrink-0 px-6 text-sm">{error}</p>
            ) : null}

            <SheetFooter className="border-t border-white/[0.06] shrink-0 flex-row flex-wrap justify-end gap-2 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/[0.1]"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="solid"
                className="rounded-xl"
                onClick={handleSave}
              >
                Save changes
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
