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
import { cn } from "@/lib/utils";
import type { TaskRelatedKind } from "@/lib/crm/types";

import {
  TASK_PRIORITY_OPTIONS,
  defaultDueIso,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "./TaskFormShared";
import { TaskRelatedFields } from "./TaskRelatedFields";
import { useTasks } from "./TasksContext";

export function AddTaskSheet() {
  const { addTask } = useTasks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [relatedKind, setRelatedKind] = useState<TaskRelatedKind>("none");
  const [relatedId, setRelatedId] = useState<string | null>(null);
  const [dueLocal, setDueLocal] = useState(() =>
    toDatetimeLocalValue(defaultDueIso()),
  );
  const [priority, setPriority] =
    useState<(typeof TASK_PRIORITY_OPTIONS)[number]["value"]>("medium");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setRelatedKind("none");
    setRelatedId(null);
    setDueLocal(toDatetimeLocalValue(defaultDueIso()));
    setPriority("medium");
    setAssignee("");
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
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Add a title so future-you knows what to ship.");
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
      setError("Pick what this task is linked to, or choose General.");
      return;
    }

    addTask({
      title: trimmed,
      relatedKind,
      relatedId: relatedKind === "none" ? null : relatedId,
      dueAt: dueIso,
      priority,
      assignee,
    });
    handleOpenChange(false);
  }, [
    addTask,
    assignee,
    dueLocal,
    handleOpenChange,
    priority,
    relatedId,
    relatedKind,
    title,
  ]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        type="button"
        className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
      >
        <Plus className="size-4" aria-hidden />
        Add task
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-sidebar-border shrink-0 border-b px-6 py-4">
          <SheetTitle>New task</SheetTitle>
          <SheetDescription>
            Capture one concrete next step. It lands in Today or Ahead from its
            due time.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <label
              htmlFor="task-title"
              className="text-foreground text-xs font-semibold"
            >
              Title<span className="text-primary"> *</span>
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Send pricing recap, Baltic Freight"
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
              htmlFor="task-due"
              className="text-muted-foreground text-xs font-medium"
            >
              Due
            </label>
            <Input
              id="task-due"
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="task-assignee"
              className="text-muted-foreground text-xs font-medium"
            >
              Assignee
            </label>
            <Input
              id="task-assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Defaults to You"
              className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
              autoComplete="name"
            />
          </div>
        </div>

        {error ? (
          <p className="text-destructive shrink-0 px-6 text-sm">{error}</p>
        ) : null}

        <SheetFooter className="border-sidebar-border shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="solid" onClick={handleSubmit}>
            Add task
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
