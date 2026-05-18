"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { Button, buttonVariants } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/Ui/Sheet";
import type { ProjectStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { useDeals } from "./DealsContext";
import { useProjects, type NewProjectInput } from "./ProjectsContext";

const STATUS_OPTIONS: { value: ProjectStatus; label: string; hint: string }[] =
  [
    { value: "planned", label: "Planned", hint: "Not started" },
    { value: "active", label: "Active", hint: "In progress" },
    { value: "blocked", label: "Blocked", hint: "Waiting" },
    { value: "done", label: "Done", hint: "Shipped" },
  ];

export function AddProjectSheet() {
  const { addProject } = useProjects();
  const { deals } = useDeals();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [scheduledStart, setScheduledStart] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [scheduledHour, setScheduledHour] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planned");
  const [owner, setOwner] = useState("You");
  const [dealId, setDealId] = useState<string | "">("");
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setCompany("");
    setScheduledStart(new Date().toISOString().slice(0, 10));
    setScheduledHour("");
    setStatus("planned");
    setOwner("You");
    setDealId("");
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) reset();
    },
    [reset],
  );

  const handleSubmit = useCallback(() => {
    const t = title.trim();
    const co = company.trim();
    if (!t) {
      setError("Project title is required.");
      return;
    }
    if (!co) {
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

    const payload: NewProjectInput = {
      title: t,
      company: co,
      scheduledStart,
      scheduledHour: scheduledHourNum,
      status,
      owner: owner.trim() || "You",
      dealId: dealId ? dealId : null,
    };

    addProject(payload);
    handleOpenChange(false);
  }, [
    addProject,
    company,
    dealId,
    handleOpenChange,
    owner,
    scheduledHour,
    scheduledStart,
    status,
    title,
  ]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "solid", size: "sm" }),
          "rounded-xl",
        )}
      >
        <Plus className="size-4" aria-hidden />
        Add project
      </SheetTrigger>
      <SheetContent
        side="right"
        className="bg-card/95 flex w-full max-w-[min(100vw,480px)] flex-col border-white/[0.08] backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-white/[0.06] px-6 pb-4 pt-4 text-left">
          <SheetTitle className="text-foreground text-lg font-semibold tracking-tight">
            New project
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm leading-relaxed">
            Schedule work on the calendar board. Company is matched or created
            like on deals.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <label
              htmlFor="project-title"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Title
            </label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Website revamp — phase 2"
              className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="project-company"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Company
            </label>
            <Input
              id="project-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Customer or org name"
              className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="project-start"
                className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
              >
                Start date
              </label>
              <Input
                id="project-start"
                type="date"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="project-hour"
                className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
              >
                Hour (0–23, day view)
              </label>
              <Input
                id="project-hour"
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
              htmlFor="project-owner"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Owner
            </label>
            <Input
              id="project-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="You"
              className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="project-deal"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Linked deal (optional)
            </label>
            <select
              id="project-deal"
              value={dealId}
              onChange={(e) =>
                setDealId(e.target.value as string | "")
              }
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

          {error ? (
            <p className="text-destructive text-sm leading-relaxed">{error}</p>
          ) : null}
        </div>

        <SheetFooter className="border-t border-white/[0.06] px-6 py-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/[0.1]"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              className="rounded-xl"
              onClick={handleSubmit}
            >
              Create project
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
