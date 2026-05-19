"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Task, TaskPriority, TaskRelatedKind } from "@/lib/crm/types";

import { advanceScheduledWindowNextLocalDay } from "./TaskFormShared";

const STORAGE_KEY = "crm-tasks-v3";

function isStoredRelatedKind(v: unknown): v is TaskRelatedKind {
  return (
    v === "none" ||
    v === "deal" ||
    v === "company" ||
    v === "contact" ||
    v === "lead" ||
    v === "goal"
  );
}

function normalizeStoredTask(row: unknown): Task | null {
  if (!row || typeof row !== "object") return null;
  const t = row as Partial<Task>;
  if (typeof t.id !== "string" || typeof t.title !== "string") return null;
  const rkRaw = isStoredRelatedKind(t.relatedKind) ? t.relatedKind : "none";
  const ridRaw =
    typeof t.relatedId === "string" && t.relatedId.trim()
      ? t.relatedId.trim()
      : null;
  const rk = rkRaw !== "none" && !ridRaw ? "none" : rkRaw;
  const relatedId = rk === "none" ? null : ridRaw;

  const sfRaw =
    typeof t.scheduledFromAt === "string" && t.scheduledFromAt.trim()
      ? t.scheduledFromAt.trim()
      : null;

  return {
    id: t.id,
    title: t.title,
    relatedKind: rk,
    relatedId,
    scheduledFromAt: sfRaw,
    dueAt:
      typeof t.dueAt === "string"
        ? t.dueAt
        : new Date().toISOString(),
    priority:
      t.priority === "high" || t.priority === "medium" || t.priority === "low"
        ? t.priority
        : "medium",
    repeatDaily: Boolean(t.repeatDaily),
    done: Boolean(t.done),
    assignee: typeof t.assignee === "string" ? t.assignee : "You",
  };
}

function loadStored(): Task[] | null {
  if (typeof window === "undefined") return null;
  try {
    const rawLegacy = window.localStorage.getItem("crm-tasks-v2");
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ?? rawLegacy;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const normalized = parsed
      .map((x) => normalizeStoredTask(x))
      .filter((x): x is Task => x != null);
    return normalized.length > 0 ? normalized : [];
  } catch {
    return null;
  }
}

function persist(list: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export type NewTaskInput = {
  title: string;
  relatedKind: TaskRelatedKind;
  relatedId: string | null;
  /** Window start (optional); `dueAt` is the end of the window. */
  scheduledFromAt?: string | null;
  dueAt: string;
  priority: TaskPriority;
  repeatDaily?: boolean;
  assignee: string;
};

export type TaskUpdateInput = Partial<Omit<Task, "id">>;

type TasksContextValue = {
  tasks: Task[];
  addTask: (input: NewTaskInput) => Task;
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: TaskUpdateInput) => void;
  deleteTask: (id: string) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored !== null) {
        setTasks(stored);
      } else {
        setTasks([]);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(tasks);
  }, [tasks, hydrated]);

  const addTask = useCallback((input: NewTaskInput) => {
    const title = input.title.trim();
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const rk = input.relatedKind;
    const rid =
      rk === "none"
        ? null
        : input.relatedId && input.relatedId.trim()
          ? input.relatedId.trim()
          : null;

    const from =
      typeof input.scheduledFromAt === "string" && input.scheduledFromAt.trim()
        ? input.scheduledFromAt.trim()
        : null;

    const task: Task = {
      id,
      title,
      relatedKind: rk === "none" ? "none" : rk,
      relatedId: rk === "none" ? null : rid,
      scheduledFromAt: from,
      dueAt: input.dueAt,
      priority: input.priority,
      repeatDaily: Boolean(input.repeatDaily),
      done: false,
      assignee: input.assignee.trim() || "You",
    };

    setTasks((prev) => [...prev, task]);
    return task;
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.done) return { ...t, done: false };
        if (t.repeatDaily) {
          const rolled = advanceScheduledWindowNextLocalDay(
            t.scheduledFromAt,
            t.dueAt,
          );
          return {
            ...t,
            scheduledFromAt: rolled.scheduledFromAt,
            dueAt: rolled.dueAt,
            done: false,
          };
        }
        return { ...t, done: true };
      }),
    );
  }, []);

  const updateTask = useCallback((id: string, patch: TaskUpdateInput) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      addTask,
      toggleTask,
      updateTask,
      deleteTask,
    }),
    [tasks, addTask, toggleTask, updateTask, deleteTask],
  );

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasks must be used within TasksProvider");
  }
  return ctx;
}
