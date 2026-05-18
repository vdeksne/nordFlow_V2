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
import type { Goal, GoalArea, GoalHorizon, GoalStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { normalizeGoalProgress, useGoals } from "./GoalsContext";

type GoalDetailSheetProps = {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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

const HORIZON_OPTIONS: { value: GoalHorizon; label: string; hint: string }[] =
  [
    {
      value: "short_term",
      label: "Short-term",
      hint: "~30–90 days",
    },
    {
      value: "long_term",
      label: "Long-term",
      hint: "Annual / strategic",
    },
  ];

export function GoalDetailSheet({
  goal,
  open,
  onOpenChange,
}: GoalDetailSheetProps) {
  const { updateGoal, deleteGoal } = useGoals();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState("0");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [horizon, setHorizon] = useState<GoalHorizon>("short_term");
  const [area, setArea] = useState<GoalArea | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(false);

  useEffect(() => {
    if (!open || !goal) return;
    queueMicrotask(() => {
      setTitle(goal.title);
      setMetric(goal.metric ?? "");
      setTargetDate(goal.targetDate ?? "");
      setProgress(String(goal.progress));
      setStatus(goal.status);
      setHorizon(goal.horizon);
      setArea(goal.area ?? "");
      setReviewNote(goal.reviewNote ?? "");
      setError(null);
      setDeleteStep(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft resets when switching goal
  }, [open, goal?.id]);

  const handleSave = useCallback(() => {
    if (!goal) return;
    const t = title.trim();
    if (!t) {
      setError("Title can’t be empty.");
      return;
    }
    const prog = normalizeGoalProgress(Number(progress.replace(",", ".")));

    updateGoal(goal.id, {
      horizon,
      title: t,
      metric: metric.trim() || null,
      targetDate: targetDate.trim() || null,
      progress: prog,
      status,
      area: area || null,
      reviewNote: reviewNote.trim() || null,
    });
    setError(null);
    onOpenChange(false);
  }, [
    area,
    goal,
    horizon,
    metric,
    onOpenChange,
    progress,
    reviewNote,
    status,
    targetDate,
    title,
    updateGoal,
  ]);

  const handleDelete = useCallback(() => {
    if (!goal) return;
    deleteGoal(goal.id);
    setDeleteStep(false);
    onOpenChange(false);
  }, [deleteGoal, goal, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-card/95 flex h-full w-full max-w-[min(100vw,520px)] flex-col gap-0 border-white/[0.08] backdrop-blur-xl sm:max-w-lg"
      >
        {goal ? (
          <>
            <SheetHeader className="border-b border-white/[0.06] px-6 pb-4 pt-4 text-left">
              <SheetTitle className="text-foreground text-lg font-semibold tracking-tight">
                {title.trim() || "Goal"}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-sm leading-relaxed">
                Edit horizon, measurable outcome, cadence notes — close the loop
                like an exec review.
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                  Horizon
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {HORIZON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setHorizon(opt.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition-colors",
                        horizon === opt.value
                          ? "border-primary bg-primary/[0.12] text-primary ring-1 ring-primary/25"
                          : "border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_45%,transparent)] text-muted-foreground hover:border-white/[0.14]",
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
                  htmlFor="goal-detail-title"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Title
                </label>
                <Input
                  id="goal-detail-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="goal-detail-metric"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Success metric
                </label>
                <textarea
                  id="goal-detail-metric"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  rows={3}
                  className="border-input bg-[color-mix(in_oklab,var(--card)_65%,transparent)] text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border border-white/[0.1] px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="goal-detail-target"
                    className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                  >
                    Target date
                  </label>
                  <Input
                    id="goal-detail-target"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_65%,transparent)]"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="goal-detail-progress"
                    className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                  >
                    Progress (0–100)
                  </label>
                  <Input
                    id="goal-detail-progress"
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
                  htmlFor="goal-detail-area"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Area
                </label>
                <select
                  id="goal-detail-area"
                  value={area}
                  onChange={(e) =>
                    setArea(
                      e.target.value === "" ? "" : (e.target.value as GoalArea),
                    )
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
                  htmlFor="goal-detail-review"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Review note
                </label>
                <textarea
                  id="goal-detail-review"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  className="border-input bg-[color-mix(in_oklab,var(--card)_65%,transparent)] text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[64px] w-full rounded-md border border-white/[0.1] px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                {deleteStep ? (
                  <div className="bg-destructive/10 space-y-3 rounded-xl border border-destructive/25 p-4">
                    <p className="text-destructive text-sm font-medium">
                      Delete this goal permanently?
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
                    Delete goal
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
