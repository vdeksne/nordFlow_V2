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
import type { GoalArea, GoalHorizon, GoalStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import {
  normalizeGoalProgress,
  useGoals,
  type NewGoalInput,
} from "./GoalsContext";

const AREA_OPTIONS: { value: GoalArea; label: string }[] = [
  { value: "revenue", label: "Revenue & pipeline" },
  { value: "delivery", label: "Delivery & quality" },
  { value: "growth", label: "Growth & brand" },
  { value: "health", label: "Health & energy" },
  { value: "learning", label: "Learning & craft" },
  { value: "relationships", label: "Relationships" },
];

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function AddGoalSheet({ horizon }: { horizon: GoalHorizon }) {
  const { addGoal } = useGoals();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState("0");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [area, setArea] = useState<GoalArea | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const horizonLabel =
    horizon === "short_term" ? "Short-term" : "Long-term";

  const reset = useCallback(() => {
    setTitle("");
    setMetric("");
    setTargetDate("");
    setProgress("0");
    setStatus("active");
    setArea("");
    setReviewNote("");
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
    if (!t) {
      setError("Give this goal a clear title.");
      return;
    }
    const prog = normalizeGoalProgress(Number(progress.replace(",", ".")));

    const payload: NewGoalInput = {
      horizon,
      title: t,
      metric: metric.trim() || null,
      targetDate: targetDate.trim() || null,
      progress: prog,
      status,
      area: area || null,
      reviewNote: reviewNote.trim() || null,
    };

    addGoal(payload);
    handleOpenChange(false);
  }, [
    addGoal,
    area,
    handleOpenChange,
    horizon,
    metric,
    progress,
    reviewNote,
    status,
    targetDate,
    title,
  ]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-xl border-white/[0.1]",
        )}
      >
        <Plus className="size-4" aria-hidden />
        Add {horizonLabel.toLowerCase()}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="bg-card/95 flex w-full max-w-[min(100vw,480px)] flex-col border-white/[0.08] backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-white/[0.06] px-6 pb-4 pt-4 text-left">
          <SheetTitle className="text-foreground text-lg font-semibold tracking-tight">
            New {horizonLabel.toLowerCase()} goal
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm leading-relaxed">
            Specific outcome, measurable signal, target date — the habits top
            performers review weekly or quarterly.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <label
              htmlFor="goal-new-title"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Title
            </label>
            <Input
              id="goal-new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Signed renewal playbook with top 5 accounts"
              className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="goal-new-metric"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Success metric
            </label>
            <textarea
              id="goal-new-metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="How will you know it’s done? One observable outcome."
              rows={3}
              className="border-input bg-[color-mix(in_oklab,var(--card)_65%,transparent)] text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border border-white/[0.1] px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="goal-new-target"
                className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
              >
                Target date
              </label>
              <Input
                id="goal-new-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="goal-new-progress"
                className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
              >
                Progress (0–100)
              </label>
              <Input
                id="goal-new-progress"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="goal-new-area"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Area
            </label>
            <select
              id="goal-new-area"
              value={area}
              onChange={(e) =>
                setArea(e.target.value === "" ? "" : (e.target.value as GoalArea))
              }
              className="border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <option value="">General</option>
              {AREA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors",
                    status === opt.value
                      ? "border-primary bg-primary/[0.12] text-primary ring-1 ring-primary/25"
                      : "border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_45%,transparent)] text-muted-foreground hover:border-white/[0.14]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="goal-new-review"
              className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
            >
              Review note
            </label>
            <textarea
              id="goal-new-review"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Last retro — blockers, next bold move"
              rows={2}
              className="border-input bg-[color-mix(in_oklab,var(--card)_65%,transparent)] text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[64px] w-full rounded-md border border-white/[0.1] px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm">{error}</p>
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
              Save goal
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
