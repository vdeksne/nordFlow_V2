"use client";

import { Loader2, Plus, Sparkles } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button, buttonVariants } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Ui/Dialog";
import {
  GOAL_AREA_OPTIONS,
  goalAreaDomain,
  goalAreaPillClass,
  type GoalArea,
} from "@/lib/crm/goal-areas";
import {
  goalAddFormBeatsLine,
  goalHorizonAddCtaLabel,
  goalHorizonBadge,
  goalHorizonHumanTitle,
  goalHorizonRibbonClass,
  goalHorizonTriggerRingClass,
  isVisionHorizon,
  needsStrategicParent,
  supportsOptionalVisionParent,
} from "@/lib/crm/goal-horizons";
import type { GoalHorizon, GoalStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import {
  normalizeGoalProgress,
  useGoals,
  type NewGoalInput,
} from "./GoalsContext";
import {
  goalEditorDialogPopupClassName,
  goalEditorInnerPanelClassName,
} from "./goal-editor-layout";

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase"
      >
        {children}
      </label>
      {optional ? (
        <span className="text-muted-foreground/70 text-[10px] font-medium">
          Optional
        </span>
      ) : null}
    </div>
  );
}

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step?: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white/[0.02] border-white/8 rounded-none border p-4 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]">
      <div className="flex flex-wrap items-start gap-2">
        {step != null ? (
          <span
            className="bg-primary/14 text-primary ring-primary/22 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-none text-[10px] font-bold tabular-nums ring-1"
            aria-hidden
          >
            {step}
          </span>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-foreground text-[13px] font-semibold tracking-tight">
            {title}
          </h3>
          {description ? (
            <p className="text-muted-foreground text-[12px] leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

const controlClass = cn(
  "border-white/10 bg-[color-mix(in_oklab,var(--card)_65%,transparent)] text-foreground",
  "focus-visible:ring-ring h-11 w-full rounded-none border px-3.5 text-sm",
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none",
);

const textareaClass = cn(
  controlClass,
  "min-h-[88px] resize-y py-2.5 leading-relaxed",
  "placeholder:text-muted-foreground",
);

export function AddGoalSheet({ horizon }: { horizon: GoalHorizon }) {
  const { addGoal, goals, goalsApiUnreachable } = useGoals();
  const formId = useId();
  const field = (name: string) => `${formId}-${name}`;
  const titleRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState("0");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [area, setArea] = useState<GoalArea | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [longTermGoalId, setLongTermGoalId] = useState("");
  const [visionParentGoalId, setVisionParentGoalId] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    const rank = (hz: GoalHorizon): number => {
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
    if (!open || !needsStrategicParent(horizon)) return;
    setLongTermGoalId((prev) => {
      if (prev && longParents.some((p) => p.id === prev)) return prev;
      return longParents[0]?.id ?? "";
    });
  }, [open, horizon, longParents]);

  useEffect(() => {
    if (!open || !supportsOptionalVisionParent(horizon)) return;
    setVisionParentGoalId((prev) =>
      prev && visionParents.some((p) => p.id === prev) ? prev : "",
    );
  }, [open, horizon, visionParents]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => titleRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [error]);

  const horizonTitle = goalHorizonHumanTitle(horizon);
  const showStrategicRollup = needsStrategicParent(horizon);
  const showVisionAnchorPick = supportsOptionalVisionParent(horizon);
  const stepOutcome =
    showStrategicRollup || showVisionAnchorPick ? 2 : 1;
  const stepTracking =
    showStrategicRollup || showVisionAnchorPick ? 3 : 2;

  const reset = useCallback(() => {
    setSaving(false);
    setTitle("");
    setMetric("");
    setTargetDate("");
    setProgress("0");
    setStatus("active");
    setArea("");
    setReviewNote("");
    setLongTermGoalId("");
    setVisionParentGoalId("");
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) reset();
    },
    [reset],
  );

  const handleSubmit = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      setError("Give this goal a clear title.");
      titleRef.current?.focus();
      return;
    }
    const prog = normalizeGoalProgress(Number(progress.replace(",", ".")));

    if (needsStrategicParent(horizon)) {
      if (longParents.length === 0) {
        setError(
          "Create at least one long-term goal before adding short-term goals.",
        );
        return;
      }
      if (
        !longTermGoalId ||
        !longParents.some((p) => p.id === longTermGoalId)
      ) {
        setError(
          "Choose which long-term goal this short-term outcome supports.",
        );
        return;
      }
    }

    if (supportsOptionalVisionParent(horizon)) {
      if (
        visionParentGoalId &&
        !visionParents.some((p) => p.id === visionParentGoalId)
      ) {
        setError(
          "Choose a valid ultra-long vision goal, or clear the dropdown.",
        );
        return;
      }
    }

    const payload: NewGoalInput = {
      horizon,
      longTermGoalId: needsStrategicParent(horizon) ? longTermGoalId : null,
      visionParentGoalId: supportsOptionalVisionParent(horizon)
        ? visionParentGoalId.trim() || null
        : null,
      title: t,
      metric: metric.trim() || null,
      targetDate: targetDate.trim() || null,
      progress: prog,
      status,
      area: area || null,
      reviewNote: reviewNote.trim() || null,
    };

    setSaving(true);
    try {
      const result = await addGoal(payload);
      if (!result.ok) {
        setError(
          result.error?.trim() ||
            "Could not save this goal. Try again in a moment.",
        );
        return;
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [
    addGoal,
    area,
    handleOpenChange,
    horizon,
    longParents,
    longTermGoalId,
    visionParents,
    visionParentGoalId,
    metric,
    progress,
    reviewNote,
    status,
    targetDate,
    title,
  ]);

  const progressNum = normalizeGoalProgress(Number(progress.replace(",", ".")));

  const triggerAccent = goalHorizonTriggerRingClass(horizon);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "rounded-none border-white/[0.14] py-2.5 normal-case tracking-[0.14em]",
          triggerAccent,
        )}
      >
        <Sparkles className="size-3.5 opacity-80" aria-hidden />
        {goalHorizonAddCtaLabel(horizon)}
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className={goalEditorDialogPopupClassName}
      >
        <div className={goalEditorInnerPanelClassName}>
        <DialogHeader className="border-b border-white/6 shrink-0 px-6 pb-4 pt-5 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <DialogTitle className="text-foreground text-lg font-semibold tracking-tight">
              New {horizonTitle}
            </DialogTitle>
            <span
              className={cn(
                "rounded-none border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                goalHorizonRibbonClass(horizon),
              )}
            >
              {goalHorizonBadge(horizon)}
            </span>
          </div>
          <DialogDescription className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
            Three quick beats: {goalAddFormBeatsLine(horizon)}{" "}
            Everything else is optional.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          onKeyDown={(e: KeyboardEvent<HTMLFormElement>) => {
            if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
            {goalsApiUnreachable ? (
              <div
                role="status"
                className="border-amber-400/30 bg-amber-500/[0.07] text-foreground rounded-none border px-3 py-2.5 text-[12px] leading-relaxed"
              >
                Goals aren&apos;t syncing with the database yet. Saves stay in
                this browser until <strong className="font-semibold">Retry sync</strong>{" "}
                succeeds.
              </div>
            ) : null}

            {showStrategicRollup ? (
              <FormSection
                step={1}
                title="Roll up to a north star"
                description="Pick one long-term goal this outcome reinforces."
              >
                {longParents.length === 0 ? (
                  <div className="border-amber-400/25 bg-amber-500/[0.04] rounded-none border border-dashed px-4 py-8 text-center">
                    <p className="text-muted-foreground text-[13px] leading-relaxed">
                      You need at least one{" "}
                      <strong className="text-foreground font-semibold">
                        long-term
                      </strong>{" "}
                      goal first. Add one from the strategic column, then come
                      back here.
                    </p>
                  </div>
                ) : (
                  <fieldset className="space-y-2">
                    <legend className="sr-only">Long-term parent goal</legend>
                    <ul className="flex max-h-[min(40vh,280px)] flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
                      {longParents.map((p) => {
                        const selected = longTermGoalId === p.id;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                setLongTermGoalId(p.id);
                                setError(null);
                              }}
                              className={cn(
                                "border-white/10 hover:border-white/18 w-full rounded-none border px-3 py-3 text-left transition-colors",
                                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none",
                                selected
                                  ? "border-primary bg-primary/12 ring-primary/28 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)] ring-1"
                                  : "bg-[color-mix(in_oklab,var(--card)_55%,transparent)]",
                              )}
                            >
                              <span className="text-foreground line-clamp-2 text-[13px] font-semibold leading-snug">
                                {p.title}
                              </span>
                              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
                                <span>{p.progress}% progress</span>
                                <span className="text-muted-foreground/70">
                                  Updated {p.updatedAt}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {longParents.length === 1 ? (
                      <p className="text-muted-foreground text-[11px] leading-snug">
                        Only one north star exists — it&apos;s selected for you.
                      </p>
                    ) : null}
                  </fieldset>
                )}
              </FormSection>
            ) : null}

            {showVisionAnchorPick ? (
              <FormSection
                step={showStrategicRollup ? undefined : 1}
                title="Anchor under vision (optional)"
                description="Tie this strategic runway to any 5-, 10-, or 20-year vision — skip if unsure."
              >
                <fieldset className="space-y-2">
                  <legend className="sr-only">
                    Optional ultra-long vision alignment
                  </legend>
                  <label
                    htmlFor={field("vision-parent")}
                    className="sr-only"
                  >
                    Ultra-long vision
                  </label>
                  <select
                    id={field("vision-parent")}
                    disabled={saving}
                    value={visionParentGoalId}
                    onChange={(e) => setVisionParentGoalId(e.target.value)}
                    className={controlClass}
                  >
                    <option value="">None — standalone strategic</option>
                    {visionParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Add vision pillars from the ultra-long boards if this menu
                    is empty.
                  </p>
                </fieldset>
              </FormSection>
            ) : null}

            <FormSection
              step={stepOutcome}
              title="Name the outcome"
              description="Title first — metrics sharpen the picture."
            >
              <div className="space-y-2">
                <FieldLabel htmlFor={field("title")}>Title</FieldLabel>
                <Input
                  ref={titleRef}
                  id={field("title")}
                  name="title"
                  value={title}
                  disabled={saving}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError(null);
                  }}
                  placeholder="What ships — in plain language"
                  autoComplete="off"
                  className={cn(
                    controlClass,
                    "h-12 text-[15px] font-medium placeholder:font-normal",
                  )}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor={field("metric")} optional>
                  Success metric
                </FieldLabel>
                <textarea
                  id={field("metric")}
                  name="metric"
                  value={metric}
                  disabled={saving}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="One observable signal — what changed when this is done?"
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </FormSection>

            <FormSection
              step={stepTracking}
              title="Tracking"
              description="Deadline and where you’re starting from."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor={field("target")} optional>
                    Target date
                  </FieldLabel>
                  <Input
                    id={field("target")}
                    name="targetDate"
                    type="date"
                    value={targetDate}
                    disabled={saving}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className={cn(controlClass, "min-w-0")}
                  />
                </div>
              </div>
              <div className="border-white/8 bg-black/15 rounded-none border p-4">
                <div className="space-y-3">
                  <FieldLabel htmlFor={field("progress")}>
                    Starting progress ({progressNum}%)
                  </FieldLabel>
                  <input
                    id={field("progress-slider")}
                    type="range"
                    min={0}
                    max={100}
                    disabled={saving}
                    value={progressNum}
                    onChange={(e) =>
                      setProgress(String(Number(e.target.value)))
                    }
                    className="accent-primary h-2 w-full cursor-pointer disabled:opacity-45"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressNum}
                  />
                  <Input
                    id={field("progress")}
                    name="progress"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={progress}
                    disabled={saving}
                    onChange={(e) => setProgress(e.target.value)}
                    className={cn(
                      controlClass,
                      "max-w-[7rem] font-mono tabular-nums",
                    )}
                    aria-label="Progress value 0 to 100"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Labels"
              description="Domain and lifecycle — tweak anytime."
            >
              <div className="space-y-3">
                <FieldLabel optional>Life domain</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setArea("")}
                    className={cn(
                      "rounded-none border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                      area === ""
                        ? "border-primary bg-primary/14 text-primary ring-primary/22 ring-1"
                        : cn(
                            goalAreaPillClass(null),
                            "hover:bg-white/[0.04]",
                          ),
                    )}
                  >
                    General
                  </button>
                  {GOAL_AREA_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={saving}
                      onClick={() => setArea(opt.value)}
                      className={cn(
                        "rounded-none border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                        area === opt.value
                          ? "border-primary bg-primary/14 text-primary ring-primary/22 ring-1"
                          : cn(
                              goalAreaPillClass(opt.value),
                              "hover:brightness-110",
                            ),
                      )}
                    >
                      {goalAreaDomain(opt.value)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={saving}
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "rounded-none border px-4 py-2.5 text-[12px] font-semibold transition-colors",
                        status === opt.value
                          ? "border-primary bg-primary/12 text-primary ring-primary/22 ring-1"
                          : "border-white/8 bg-[color-mix(in_oklab,var(--card)_45%,transparent)] text-muted-foreground hover:border-white/14 hover:bg-white/[0.03]",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </FormSection>

            <details className="bg-white/[0.02] border-white/8 group rounded-none border open:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]">
              <summary className="text-foreground hover:bg-white/[0.03] cursor-pointer list-none rounded-none px-4 py-3.5 text-[13px] font-medium transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  Review note
                  <span className="text-muted-foreground text-[11px] font-normal">
                    <span className="group-open:hidden">Optional context</span>
                    <span className="hidden group-open:inline">Hide</span>
                  </span>
                </span>
              </summary>
              <div className="border-t border-white/6 space-y-2 px-4 pt-3 pb-4">
                <FieldLabel htmlFor={field("review")} optional>
                  Note
                </FieldLabel>
                <textarea
                  id={field("review")}
                  name="reviewNote"
                  value={reviewNote}
                  disabled={saving}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Blockers, bold next move, retro scratchpad…"
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </details>

            <p className="text-muted-foreground text-center text-[11px] leading-relaxed">
              <kbd className="border-white/12 bg-white/4 rounded-none px-1.5 py-0.5 font-mono text-[10px]">
                ⌘
              </kbd>
              {" / "}
              <kbd className="border-white/12 bg-white/4 rounded-none px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl
              </kbd>
              {" + "}
              <kbd className="border-white/12 bg-white/4 rounded-none px-1.5 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>
              {" save · "}
              <kbd className="border-white/12 bg-white/4 rounded-none px-1.5 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>
              {" close"}
            </p>

            {error ? (
              <p
                ref={errorRef}
                role="alert"
                className="text-destructive bg-destructive/8 border-destructive/25 rounded-none border px-3 py-2.5 text-sm leading-snug"
              >
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t border-white/6 bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shrink-0 justify-end gap-2 px-6 py-4 backdrop-blur-md">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-white/10"
                disabled={saving}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="solid"
                className="rounded-none"
                disabled={
                  saving ||
                  (needsStrategicParent(horizon) && longParents.length === 0)
                }
              >
                {saving ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" aria-hidden />
                    Save goal
                  </>
                )}
              </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
