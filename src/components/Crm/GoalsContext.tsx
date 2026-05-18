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

import { goals as seedGoals } from "@/lib/crm/mock-data";
import type { Goal, GoalArea, GoalHorizon, GoalStatus } from "@/lib/crm/types";

const STORAGE_KEY = "crm-goals-v1";

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadStored(): Goal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Goal[];
  } catch {
    return null;
  }
}

function persist(list: Goal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function normalizeGoalProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export type NewGoalInput = {
  horizon: GoalHorizon;
  title: string;
  metric: string | null;
  targetDate: string | null;
  progress: number;
  status: GoalStatus;
  area: GoalArea | null;
  reviewNote: string | null;
};

export type GoalUpdateInput = Partial<{
  horizon: GoalHorizon;
  title: string;
  metric: string | null;
  targetDate: string | null;
  progress: number;
  status: GoalStatus;
  area: GoalArea | null;
  reviewNote: string | null;
  sortOrder: number;
}>;

type GoalsContextValue = {
  goals: Goal[];
  addGoal: (input: NewGoalInput) => void;
  updateGoal: (id: string, patch: GoalUpdateInput) => void;
  deleteGoal: (id: string) => void;
};

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(seedGoals);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored && stored.length > 0) {
        setGoals(stored);
      } else {
        setGoals(seedGoals);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(goals);
  }, [goals, hydrated]);

  const addGoal = useCallback((input: NewGoalInput) => {
    setGoals((prev) => {
      const sameHorizon = prev.filter((g) => g.horizon === input.horizon);
      const maxOrder = sameHorizon.reduce(
        (m, g) => Math.max(m, g.sortOrder),
        -1,
      );
      const row: Goal = {
        id: genId(),
        horizon: input.horizon,
        title: input.title.trim(),
        metric: input.metric?.trim() || null,
        targetDate: input.targetDate?.trim() || null,
        progress: normalizeGoalProgress(input.progress),
        status: input.status,
        area: input.area,
        reviewNote: input.reviewNote?.trim() || null,
        sortOrder: maxOrder + 1,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      return [...prev, row];
    });
  }, []);

  const updateGoal = useCallback((id: string, patch: GoalUpdateInput) => {
    const today = new Date().toISOString().slice(0, 10);
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const next: Goal = { ...g, updatedAt: today };
        if (patch.horizon !== undefined && patch.horizon !== g.horizon) {
          next.horizon = patch.horizon;
          const same = prev.filter(
            (x) => x.horizon === patch.horizon && x.id !== id,
          );
          next.sortOrder =
            same.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1;
        }
        if (patch.title !== undefined) next.title = patch.title.trim();
        if (patch.metric !== undefined) {
          next.metric = patch.metric?.trim() || null;
        }
        if (patch.targetDate !== undefined) {
          next.targetDate = patch.targetDate?.trim() || null;
        }
        if (patch.progress !== undefined) {
          next.progress = normalizeGoalProgress(patch.progress);
        }
        if (patch.status !== undefined) next.status = patch.status;
        if (patch.area !== undefined) next.area = patch.area;
        if (patch.reviewNote !== undefined) {
          next.reviewNote = patch.reviewNote?.trim() || null;
        }
        if (patch.sortOrder !== undefined) next.sortOrder = patch.sortOrder;
        return next;
      }),
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      goals,
      addGoal,
      updateGoal,
      deleteGoal,
    }),
    [goals, addGoal, updateGoal, deleteGoal],
  );

  return (
    <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
  );
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) {
    throw new Error("useGoals must be used within GoalsProvider");
  }
  return ctx;
}
