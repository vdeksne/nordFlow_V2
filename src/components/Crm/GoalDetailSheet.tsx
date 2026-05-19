"use client";

import { Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/Ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Ui/Dialog";
import { Input } from "@/components/Ui/Input";
import {
  GOAL_AREA_OPTIONS,
  goalAreaOptionLabel,
  type GoalArea,
} from "@/lib/crm/goal-areas";
import type { Goal, GoalHorizon, GoalStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";
import {
  GOAL_HORIZON_FORM_OPTIONS,
  isVisionHorizon,
  needsStrategicParent,
  supportsOptionalVisionParent,
} from "@/lib/crm/goal-horizons";

import {
  goalEditorDialogPopupClassName,
  goalEditorInnerPanelClassName,
} from "./goal-editor-layout";
import { normalizeGoalProgress, useGoals } from "./GoalsContext";

type GoalDetailSheetProps = {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const fieldLabel =
  "text-muted-foreground text-[10px] font-bold tracking-[0.16em] uppercase";

const inputClass =
  "rounded-none border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_72%,transparent)]";

const textareaClass = cn(
  "text-foreground placeholder:text-muted-foreground min-h-[88px] w-full rounded-none border border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] px-3 py-2.5 text-sm transition-[border-color,box-shadow]",
  "focus-visible:border-primary/45 focus-visible:ring-primary/25 focus-visible:ring-2 focus-visible:outline-none",
);

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className={cn(fieldLabel, "mb-3 border-b border-white/[0.05] pb-2")}>
      {children}
    </h3>
  );
}

export function GoalDetailSheet({
  goal,
  open,
  onOpenChange,
}: GoalDetailSheetProps) {
  const { updateGoal, deleteGoal, goals } = useGoals();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState("0");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [horizon, setHorizon] = useState<GoalHorizon>("short_term");
  const [area, setArea] = useState<GoalArea | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [longTermGoalId, setLongTermGoalId] = useState("");
  const [visionParentGoalId, setVisionParentGoalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(false);

  const longParents = useMemo(
    () =>
      [...goals]
        .filter((g) => g.horizon === "long_term")
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return b.updatedAt.localeCompare(a.updatedAt);
        }),
    [goals],
  );

  const visionParents = useMemo(() => {
    const rank = (hz: Goal["horizon"]): number => {
      if (hz === "vision_5") return 0;
      if (hz === "vision_10") return 1;
      if (hz === "vision_20") return 2;
      return 99;
    };
    return [...goals]
      .filter((g) => isVisionHorizon(g.horizon))
      .sort((a, b) => {
        const dr = rank(a.horizon) - rank(b.horizon);
        if (dr !== 0) return dr;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [goals]);

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
      setLongTermGoalId(
        needsStrategicParent(goal.horizon)
          ? (goal.longTermGoalId &&
              longParents.some((p) => p.id === goal.longTermGoalId)
              ? goal.longTermGoalId
              : longParents[0]?.id ?? "")
          : "",
      );
      setVisionParentGoalId(
        supportsOptionalVisionParent(goal.horizon) &&
          goal.visionParentGoalId &&
          visionParents.some((p) => p.id === goal.visionParentGoalId)
          ? goal.visionParentGoalId
          : "",
      );
      setError(null);
      setDeleteStep(false);
    });
  }, [
    open,
    goal?.id,
    goal?.longTermGoalId,
    goal?.visionParentGoalId,
    goal?.horizon,
    longParents,
    visionParents,
  ]);

  const progressNum = useMemo(() => {
    const n = Number(progress.replace(",", "."));
    return normalizeGoalProgress(Number.isFinite(n) ? n : 0);
  }, [progress]);

  const handleSave = useCallback(() => {
    if (!goal) return;
    const t = title.trim();
    if (!t) {
      setError("Title cannot be empty.");
      return;
    }
    const prog = normalizeGoalProgress(Number(progress.replace(",", ".")));

    if (needsStrategicParent(horizon)) {
      if (longParents.length === 0) {
        setError(
          "Create at least one long-term goal before using short-term goals.",
        );
        return;
      }
      if (
        !longTermGoalId ||
        !longParents.some((p) => p.id === longTermGoalId)
      ) {
        setError("Choose which long-term goal this supports.");
        return;
      }
    }

    let visionParentResolved: string | null = null;
    if (supportsOptionalVisionParent(horizon)) {
      if (
        visionParentGoalId &&
        !visionParents.some((p) => p.id === visionParentGoalId)
      ) {
        setError(
          "Choose a valid ultra-long vision goal, or leave the anchor empty.",
        );
        return;
      }
      visionParentResolved = visionParentGoalId.trim() || null;
    }

    updateGoal(goal.id, {
      horizon,
      longTermGoalId: needsStrategicParent(horizon) ? longTermGoalId : null,
      visionParentGoalId: supportsOptionalVisionParent(horizon)
        ? visionParentResolved
        : null,
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
    longParents,
    longTermGoalId,
    visionParents,
    visionParentGoalId,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {goal ? (
        <DialogContent
          showCloseButton
          className={goalEditorDialogPopupClassName}
        >
          <div className={goalEditorInnerPanelClassName}>
          <DialogHeader className="shrink-0 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <DialogTitle>{title.trim() || "Untitled goal"}</DialogTitle>
            <DialogDescription>
              Fullscreen editor — adjust horizon, metrics, and progress in one
              place. Save to apply changes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6">
            <section className="pb-6">
              <SectionTitle>Direction</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {GOAL_HORIZON_FORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setHorizon(opt.value);
                      if (needsStrategicParent(opt.value)) {
                        setLongTermGoalId((prev) =>
                          prev && longParents.some((p) => p.id === prev)
                            ? prev
                            : longParents[0]?.id ?? "",
                        );
                        setVisionParentGoalId("");
                      } else if (supportsOptionalVisionParent(opt.value)) {
                        setLongTermGoalId("");
                        setVisionParentGoalId((prev) =>
                          prev &&
                          visionParents.some((p) => p.id === prev)
                            ? prev
                            : "",
                        );
                      } else {
                        setLongTermGoalId("");
                        setVisionParentGoalId("");
                      }
                    }}
                    className={cn(
                      "rounded-none border px-4 py-3 text-left transition-colors",
                      horizon === opt.value
                        ? "border-primary bg-primary/[0.14] text-foreground ring-1 ring-primary/30"
                        : "border-white/[0.08] bg-black/15 text-muted-foreground hover:border-white/[0.14]",
                    )}
                  >
                    <span className="text-[13px] font-semibold">{opt.label}</span>
                    <span className="text-muted-foreground mt-1 block text-[11px] leading-snug font-normal">
                      {opt.hint}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {needsStrategicParent(horizon) ? (
              <section className="pb-6">
                <SectionTitle>Rolls up to</SectionTitle>
                <div className="space-y-2">
                  <label
                    htmlFor="goal-detail-long-parent"
                    className={fieldLabel}
                  >
                    Long-term goal
                  </label>
                  <select
                    id="goal-detail-long-parent"
                    value={longTermGoalId}
                    onChange={(e) => setLongTermGoalId(e.target.value)}
                    disabled={longParents.length === 0}
                    className={cn(
                      inputClass,
                      "text-foreground h-11 w-full px-3 text-sm",
                    )}
                  >
                    {longParents.length === 0 ? (
                      <option value="">No long-term goals yet</option>
                    ) : (
                      longParents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Short-term work always links to a single long-term outcome.
                  </p>
                </div>
              </section>
            ) : null}

            {supportsOptionalVisionParent(horizon) ? (
              <section className="pb-6">
                <SectionTitle>Anchored to ultra-long vision</SectionTitle>
                <div className="space-y-2">
                  <label
                    htmlFor="goal-detail-vision-parent"
                    className={fieldLabel}
                  >
                    Links to vision (optional)
                  </label>
                  <select
                    id="goal-detail-vision-parent"
                    value={visionParentGoalId}
                    onChange={(e) => setVisionParentGoalId(e.target.value)}
                    className={cn(
                      inputClass,
                      "text-foreground h-11 w-full px-3 text-sm",
                    )}
                  >
                    <option value="">None — standalone strategic goal</option>
                    {visionParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Pick any 5-, 10-, or 20-year vision this strategy serves. Add
                    vision goals first if this list is empty.
                  </p>
                </div>
              </section>
            ) : null}

            <section className="pb-6">
              <SectionTitle>Goal</SectionTitle>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="goal-detail-title" className={fieldLabel}>
                    Title
                  </label>
                  <Input
                    id="goal-detail-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={cn(inputClass, "h-11 text-[15px] font-medium")}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="goal-detail-metric" className={fieldLabel}>
                    Success metric
                  </label>
                  <textarea
                    id="goal-detail-metric"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    rows={3}
                    placeholder="How you know this goal is done..."
                    className={textareaClass}
                  />
                </div>
              </div>
            </section>

            <section className="pb-6">
              <SectionTitle>Tracking</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="goal-detail-target" className={fieldLabel}>
                    Target date
                  </label>
                  <Input
                    id="goal-detail-target"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className={cn(inputClass, "h-11")}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <label
                      htmlFor="goal-detail-progress-range"
                      className={fieldLabel}
                    >
                      Progress
                    </label>
                    <span className="text-primary font-mono text-xl font-bold tabular-nums">
                      {progressNum}%
                    </span>
                  </div>
                  <input
                    id="goal-detail-progress-range"
                    type="range"
                    min={0}
                    max={100}
                    value={progressNum}
                    onChange={(e) =>
                      setProgress(
                        String(
                          normalizeGoalProgress(Number(e.target.value)),
                        ),
                      )
                    }
                    className="accent-primary mt-2 h-2 w-full cursor-pointer disabled:opacity-40"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground text-[11px]">
                      Fine-tune
                    </span>
                    <Input
                      id="goal-detail-progress"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                      className={cn(inputClass, "h-9 w-[5.5rem] tabular-nums")}
                      aria-label="Progress percent"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="pb-6">
              <SectionTitle>Domains</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="goal-detail-area" className={fieldLabel}>
                    Domain
                  </label>
                  <select
                    id="goal-detail-area"
                    value={area}
                    onChange={(e) =>
                      setArea(
                        e.target.value === ""
                          ? ""
                          : (e.target.value as GoalArea),
                      )
                    }
                    className={cn(
                      inputClass,
                      "ring-offset-background focus-visible:ring-primary/35 h-11 w-full px-3 text-sm focus-visible:ring-2 focus-visible:outline-none",
                    )}
                  >
                    <option value="">General</option>
                    {GOAL_AREA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {goalAreaOptionLabel(opt.value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <p className={fieldLabel}>Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(opt.value)}
                        className={cn(
                          "rounded-none border px-4 py-2.5 text-[12px] font-semibold transition-colors",
                          status === opt.value
                            ? "border-primary bg-primary/[0.14] text-foreground ring-1 ring-primary/30"
                            : "border-white/[0.08] bg-black/15 text-muted-foreground hover:border-white/[0.14]",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="pb-2">
              <SectionTitle>Retro</SectionTitle>
              <div className="space-y-2">
                <label htmlFor="goal-detail-review" className={fieldLabel}>
                  Review note
                </label>
                <textarea
                  id="goal-detail-review"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder="Weekly retro: wins, blockers, next bold move..."
                  className={textareaClass}
                />
              </div>
            </section>
          </div>

          {error ? (
            <p
              className="text-destructive shrink-0 px-5 py-2 text-sm sm:px-6"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter className="shrink-0 bg-black/25 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {deleteStep ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-destructive text-xs font-medium">
                    Delete permanently?
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="rounded-none"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none border-white/[0.12]"
                    onClick={() => setDeleteStep(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-none"
                  onClick={() => setDeleteStep(true)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Delete goal
                </Button>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-white/[0.12]"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="solid"
                className="rounded-none px-6"
                onClick={handleSave}
              >
                Save changes
              </Button>
            </div>
          </DialogFooter>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
