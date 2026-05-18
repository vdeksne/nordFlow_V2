"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/Ui/Sheet";
import type { Task, TaskRelatedKind } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import {
  TASK_PRIORITY_OPTIONS,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "./TaskFormShared";
import { TaskRelatedFields } from "./TaskRelatedFields";
import { useTasks } from "./TasksContext";

type TaskDetailSheetProps = {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
}: TaskDetailSheetProps) {
  const { updateTask, deleteTask, toggleTask } = useTasks();
  const [title, setTitle] = useState("");
  const [relatedKind, setRelatedKind] = useState<TaskRelatedKind>("none");
  const [relatedId, setRelatedId] = useState<string | null>(null);
  const [dueLocal, setDueLocal] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    queueMicrotask(() => {
      setTitle(task.title);
      setRelatedKind(task.relatedKind);
      setRelatedId(task.relatedId);
      setDueLocal(toDatetimeLocalValue(task.dueAt));
      setPriority(task.priority);
      setAssignee(task.assignee === "You" ? "" : task.assignee);
      setError(null);
      setDeleteStep(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft resets only when switching opened row (by id)
  }, [open, task?.id]);

  const handleSave = useCallback(() => {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title can’t be empty.");
      return;
    }
    let dueIso: string;
    try {
      dueIso = fromDatetimeLocalValue(dueLocal);
      if (Number.isNaN(new Date(dueIso).getTime())) {
        setError("Pick a valid due date and time.");
        return;
      }
    } catch {
      setError("Pick a valid due date and time.");
      return;
    }

    if (relatedKind !== "none" && !relatedId?.trim()) {
      setError("Pick what this task is linked to, or set Link to General.");
      return;
    }

    updateTask(task.id, {
      title: trimmed,
      relatedKind,
      relatedId: relatedKind === "none" ? null : relatedId,
      dueAt: dueIso,
      priority,
      assignee: assignee.trim() || "You",
    });
    setError(null);
    onOpenChange(false);
  }, [
    assignee,
    dueLocal,
    onOpenChange,
    priority,
    relatedId,
    relatedKind,
    task,
    title,
    updateTask,
  ]);

  const handleDelete = useCallback(() => {
    if (!task) return;
    deleteTask(task.id);
    setDeleteStep(false);
    onOpenChange(false);
  }, [deleteTask, onOpenChange, task]);

  const handleMarkToggle = useCallback(() => {
    if (!task) return;
    toggleTask(task.id);
  }, [task, toggleTask]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 sm:max-w-lg"
      >
        {task ? (
          <>
            <SheetHeader className="border-sidebar-border shrink-0 border-b px-6 py-4">
              <SheetTitle className="pr-8 leading-snug">
                {title.trim() || "Task details"}
              </SheetTitle>
              <SheetDescription>
                Full view, edit fields, toggle completion, or delete from your
                queue.
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-5">
                <button
                  type="button"
                  onClick={handleMarkToggle}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    task.done && "border-primary text-primary",
                  )}
                >
                  {task.done ? "Reopen task" : "Mark complete"}
                </button>
                <span className="text-muted-foreground text-[11px] tracking-wide">
                  Updates instantly on the board.
                </span>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="detail-task-title"
                  className="text-foreground text-xs font-semibold"
                >
                  Title<span className="text-primary"> *</span>
                </label>
                <Input
                  id="detail-task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
                  autoComplete="off"
                />
              </div>

              <TaskRelatedFields
                relatedKind={relatedKind}
                relatedId={relatedId}
                onRelatedKindChange={setRelatedKind}
                onRelatedIdChange={setRelatedId}
              />

              <div className="space-y-2">
                <span className="text-muted-foreground text-xs font-medium">
                  Priority
                </span>
                <div className="flex flex-wrap gap-2">
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        priority === opt.value && "border-primary text-primary",
                      )}
                    >
                      {opt.label}
                      <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="detail-task-due"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Due
                </label>
                <Input
                  id="detail-task-due"
                  type="datetime-local"
                  value={dueLocal}
                  onChange={(e) => setDueLocal(e.target.value)}
                  className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] [color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="detail-task-assignee"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Assignee
                </label>
                <Input
                  id="detail-task-assignee"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Defaults to You"
                  className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
                  autoComplete="name"
                />
              </div>

              <div className="border-sidebar-border space-y-3 border-t border-white/[0.06] pt-5">
                {deleteStep ? (
                  <div className="bg-destructive/10 space-y-3 rounded-none border border-destructive/25 p-4">
                    <p className="text-destructive text-sm font-medium">
                      Delete this task permanently?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                      >
                        Yes, delete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
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
                    Delete task
                  </Button>
                )}
              </div>
            </div>

            {error ? (
              <p className="text-destructive shrink-0 px-6 text-sm">{error}</p>
            ) : null}

            <SheetFooter className="border-sidebar-border shrink-0 flex-row flex-wrap justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button type="button" variant="solid" onClick={handleSave}>
                Save changes
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
