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

import {
  clampHealthProgress,
  isHealthPillar,
  type HealthAction,
  type HealthGoal,
  type HealthPillar,
  type HealthPriority,
} from "@/lib/crm/health";
import {
  defaultDietPlanState,
  localTodayKey,
  normalizeDietPlan,
  type DietFoodId,
  type DietPlanState,
} from "@/lib/crm/diet-plan";
import {
  defaultWorkoutPlanState,
  normalizeWorkoutPlan,
  type WorkoutPlanState,
  type WorkoutTypeId,
} from "@/lib/crm/workout-plan";

const STORAGE_KEY = "crm-health-v1";

type StoredHealth = {
  goals: HealthGoal[];
  actions: HealthAction[];
  dietPlan: DietPlanState;
  workoutPlan: WorkoutPlanState;
};

function genId(prefix: string): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeGoal(row: unknown): HealthGoal | null {
  if (!row || typeof row !== "object") return null;
  const g = row as Partial<HealthGoal>;
  if (typeof g.id !== "string" || typeof g.title !== "string") return null;
  if (!isHealthPillar(g.pillar)) return null;
  return {
    id: g.id,
    pillar: g.pillar,
    title: g.title.trim(),
    metric: typeof g.metric === "string" ? g.metric.trim() || null : null,
    targetDate:
      typeof g.targetDate === "string" ? g.targetDate.trim() || null : null,
    progress: clampHealthProgress(Number(g.progress)),
    notes: typeof g.notes === "string" ? g.notes.trim() || null : null,
    status: g.status === "done" ? "done" : "active",
  };
}

function normalizeAction(row: unknown): HealthAction | null {
  if (!row || typeof row !== "object") return null;
  const a = row as Partial<HealthAction>;
  if (typeof a.id !== "string" || typeof a.title !== "string") return null;
  if (!isHealthPillar(a.pillar)) return null;
  const pr =
    a.priority === "high" || a.priority === "low" ? a.priority : "medium";
  return {
    id: a.id,
    pillar: a.pillar,
    goalId:
      typeof a.goalId === "string" && a.goalId.trim() ? a.goalId.trim() : null,
    title: a.title.trim(),
    dueAt: typeof a.dueAt === "string" ? a.dueAt.trim() || null : null,
    priority: pr,
    done: Boolean(a.done),
    notes: typeof a.notes === "string" ? a.notes.trim() || null : null,
  };
}

function loadStored(): StoredHealth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as {
      goals?: unknown;
      actions?: unknown;
      dietPlan?: unknown;
      workoutPlan?: unknown;
    };
    const goals = Array.isArray(o.goals)
      ? o.goals.map(normalizeGoal).filter((x): x is HealthGoal => x != null)
      : [];
    const actions = Array.isArray(o.actions)
      ? o.actions.map(normalizeAction).filter((x): x is HealthAction => x != null)
      : [];
    const dietPlan = normalizeDietPlan(o.dietPlan);
    const workoutPlan = normalizeWorkoutPlan(o.workoutPlan);
    return { goals, actions, dietPlan, workoutPlan };
  } catch {
    return null;
  }
}

function persist(data: StoredHealth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export type NewHealthGoalInput = {
  pillar: HealthPillar;
  title: string;
  metric?: string | null;
  targetDate?: string | null;
  notes?: string | null;
};

export type NewHealthActionInput = {
  pillar: HealthPillar;
  goalId?: string | null;
  title: string;
  dueAt?: string | null;
  priority?: HealthPriority;
  notes?: string | null;
};

type HealthContextValue = {
  goals: HealthGoal[];
  actions: HealthAction[];
  dietPlan: DietPlanState;
  workoutPlan: WorkoutPlanState;
  addGoal: (input: NewHealthGoalInput) => HealthGoal;
  addAction: (input: NewHealthActionInput) => HealthAction;
  updateGoal: (
    id: string,
    patch: Partial<Omit<HealthGoal, "id">>,
  ) => void;
  updateAction: (
    id: string,
    patch: Partial<Omit<HealthAction, "id">>,
  ) => void;
  toggleAction: (id: string) => void;
  deleteGoal: (id: string) => void;
  deleteAction: (id: string) => void;
  toggleDietFoodActive: (foodId: DietFoodId) => void;
  toggleDietFoodLogged: (foodId: DietFoodId) => void;
  resetDietPlanBase: () => void;
  toggleWorkoutOnDay: (dateKey: string, workoutId: WorkoutTypeId) => void;
  toggleWorkoutDone: (dateKey: string, workoutId: WorkoutTypeId) => void;
  resetWorkoutPlan: () => void;
};

const HealthContext = createContext<HealthContextValue | null>(null);

export function HealthProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [actions, setActions] = useState<HealthAction[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlanState>(
    defaultDietPlanState(),
  );
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanState>(
    defaultWorkoutPlanState(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored) {
        setGoals(stored.goals);
        setActions(stored.actions);
        setDietPlan(stored.dietPlan);
        setWorkoutPlan(stored.workoutPlan);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist({ goals, actions, dietPlan, workoutPlan });
  }, [goals, actions, dietPlan, workoutPlan, hydrated]);

  const addGoal = useCallback((input: NewHealthGoalInput) => {
    const row: HealthGoal = {
      id: genId("hg"),
      pillar: input.pillar,
      title: input.title.trim(),
      metric: input.metric?.trim() || null,
      targetDate: input.targetDate?.trim() || null,
      progress: 0,
      notes: input.notes?.trim() || null,
      status: "active",
    };
    setGoals((prev) => [...prev, row]);
    return row;
  }, []);

  const addAction = useCallback((input: NewHealthActionInput) => {
    const row: HealthAction = {
      id: genId("ha"),
      pillar: input.pillar,
      goalId: input.goalId?.trim() || null,
      title: input.title.trim(),
      dueAt: input.dueAt?.trim() || null,
      priority: input.priority ?? "medium",
      done: false,
      notes: input.notes?.trim() || null,
    };
    setActions((prev) => [...prev, row]);
    return row;
  }, []);

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<HealthGoal, "id">>) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g;
          const next = { ...g, ...patch };
          if (patch.progress !== undefined) {
            next.progress = clampHealthProgress(patch.progress);
          }
          if (patch.title !== undefined) next.title = patch.title.trim();
          if (patch.metric !== undefined) {
            next.metric = patch.metric?.trim() || null;
          }
          if (patch.targetDate !== undefined) {
            next.targetDate = patch.targetDate?.trim() || null;
          }
          if (patch.notes !== undefined) {
            next.notes = patch.notes?.trim() || null;
          }
          return next;
        }),
      );
    },
    [],
  );

  const updateAction = useCallback(
    (id: string, patch: Partial<Omit<HealthAction, "id">>) => {
      setActions((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const next = { ...a, ...patch };
          if (patch.title !== undefined) next.title = patch.title.trim();
          if (patch.dueAt !== undefined) {
            next.dueAt = patch.dueAt?.trim() || null;
          }
          if (patch.notes !== undefined) {
            next.notes = patch.notes?.trim() || null;
          }
          return next;
        }),
      );
    },
    [],
  );

  const toggleAction = useCallback((id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setActions((prev) =>
      prev.map((a) => (a.goalId === id ? { ...a, goalId: null } : a)),
    );
  }, []);

  const deleteAction = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const ensureTodayLog = useCallback((prev: DietPlanState): DietPlanState => {
    const today = localTodayKey();
    if (prev.logDate === today) return prev;
    return { ...prev, logDate: today, loggedFoodIds: [] };
  }, []);

  const toggleDietFoodActive = useCallback(
    (foodId: DietFoodId) => {
      setDietPlan((prev) => {
        const base = ensureTodayLog(prev);
        const active = new Set(base.activeFoodIds);
        if (active.has(foodId)) {
          active.delete(foodId);
        } else {
          active.add(foodId);
        }
        const logged = base.loggedFoodIds.filter((id) => active.has(id));
        return {
          ...base,
          activeFoodIds: [...active],
          loggedFoodIds: logged,
        };
      });
    },
    [ensureTodayLog],
  );

  const toggleDietFoodLogged = useCallback(
    (foodId: DietFoodId) => {
      setDietPlan((prev) => {
        const base = ensureTodayLog(prev);
        if (!base.activeFoodIds.includes(foodId)) return base;
        const logged = new Set(base.loggedFoodIds);
        if (logged.has(foodId)) logged.delete(foodId);
        else logged.add(foodId);
        return { ...base, loggedFoodIds: [...logged] };
      });
    },
    [ensureTodayLog],
  );

  const resetDietPlanBase = useCallback(() => {
    setDietPlan(defaultDietPlanState());
  }, []);

  const toggleWorkoutOnDay = useCallback(
    (dateKey: string, workoutId: WorkoutTypeId) => {
      setWorkoutPlan((prev) => {
        const current = prev.days[dateKey] ?? [];
        const exists = current.find((e) => e.workoutId === workoutId);
        let nextEntries;
        if (exists) {
          nextEntries = current.filter((e) => e.workoutId !== workoutId);
        } else {
          nextEntries = [...current, { workoutId, done: false }];
        }
        const days = { ...prev.days };
        if (nextEntries.length === 0) delete days[dateKey];
        else days[dateKey] = nextEntries;
        return { days };
      });
    },
    [],
  );

  const toggleWorkoutDone = useCallback(
    (dateKey: string, workoutId: WorkoutTypeId) => {
      setWorkoutPlan((prev) => {
        const current = prev.days[dateKey];
        if (!current) return prev;
        const nextEntries = current.map((e) =>
          e.workoutId === workoutId ? { ...e, done: !e.done } : e,
        );
        return { days: { ...prev.days, [dateKey]: nextEntries } };
      });
    },
    [],
  );

  const resetWorkoutPlan = useCallback(() => {
    setWorkoutPlan(defaultWorkoutPlanState());
  }, []);

  const value = useMemo(
    () => ({
      goals,
      actions,
      dietPlan,
      workoutPlan,
      addGoal,
      addAction,
      updateGoal,
      updateAction,
      toggleAction,
      deleteGoal,
      deleteAction,
      toggleDietFoodActive,
      toggleDietFoodLogged,
      resetDietPlanBase,
      toggleWorkoutOnDay,
      toggleWorkoutDone,
      resetWorkoutPlan,
    }),
    [
      goals,
      actions,
      dietPlan,
      workoutPlan,
      addGoal,
      addAction,
      updateGoal,
      updateAction,
      toggleAction,
      deleteGoal,
      deleteAction,
      toggleDietFoodActive,
      toggleDietFoodLogged,
      resetDietPlanBase,
      toggleWorkoutOnDay,
      toggleWorkoutDone,
      resetWorkoutPlan,
    ],
  );

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  );
}

export function useHealth(): HealthContextValue {
  const ctx = useContext(HealthContext);
  if (!ctx) {
    throw new Error("useHealth must be used within HealthProvider");
  }
  return ctx;
}
