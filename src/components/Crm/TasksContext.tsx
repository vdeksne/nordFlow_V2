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

import { tasks as seedTasks } from "@/lib/crm/mock-data";
import type { Task, TaskPriority, TaskRelatedKind } from "@/lib/crm/types";

const STORAGE_KEY = "crm-tasks-v2";

export type NewTaskInput = {
  title: string;
  relatedKind: TaskRelatedKind;
  relatedId: string | null;
  dueAt: string;
  priority: TaskPriority;
  assignee: string;
};

function loadStored(): Task[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Task[];
  } catch {
    return null;
  }
}

function persist(list: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

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
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored && stored.length > 0) {
        setTasks(stored);
      } else {
        setTasks(seedTasks);
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

    const task: Task = {
      id,
      title,
      relatedKind: rk === "none" ? "none" : rk,
      relatedId: rk === "none" ? null : rid,
      dueAt: input.dueAt,
      priority: input.priority,
      done: false,
      assignee: input.assignee.trim() || "You",
    };

    setTasks((prev) => [...prev, task]);
    return task;
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
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
