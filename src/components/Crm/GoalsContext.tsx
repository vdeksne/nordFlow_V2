"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { migrateLegacyGoalArea } from "@/lib/crm/goal-areas";
import {
  isGoalHorizon,
  needsStrategicParent,
  supportsOptionalVisionParent,
} from "@/lib/crm/goal-horizons";
import type { Goal, GoalArea, GoalHorizon, GoalStatus } from "@/lib/crm/types";

const STORAGE_KEY = "crm-goals-v1";

type GoalsBootstrapResult =
  | { kind: "neon"; goals: Goal[] }
  | { kind: "anonymous" }
  | { kind: "failed"; httpStatus: number; message: string | null };

async function bootstrapGoalsFromApi(): Promise<GoalsBootstrapResult> {
  const meRes = await fetch("/api/auth/me", { credentials: "include" });
  const me = (await meRes.json()) as { user?: { id: string } };
  if (!me?.user?.id) return { kind: "anonymous" };

  const gRes = await fetch("/api/goals", {
    credentials: "include",
    cache: "no-store",
  });

  if (!gRes.ok) {
    let message: string | null = null;
    try {
      const b = (await gRes.json()) as { error?: string };
      if (typeof b.error === "string") message = b.error;
    } catch {
      /* non-JSON error body */
    }
    return { kind: "failed", httpStatus: gRes.status, message };
  }

  const data = (await gRes.json()) as { goals?: Goal[] };
  return {
    kind: "neon",
    goals: Array.isArray(data.goals) ? data.goals : [],
  };
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Normalize cached horizon strings from older offline builds */
function coerceStoredGoalHorizon(h: unknown): GoalHorizon {
  return isGoalHorizon(h) ? h : "long_term";
}

/** Older caches omit longTermGoalId — attach shorts to the first strategic goal when possible */
function coerceStoredGoals(parsed: Goal[]): Goal[] {
  const longParents = parsed
    .filter((g) => g?.horizon === "long_term")
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  const fallbackParentId = longParents[0]?.id ?? null;

  return parsed.map((g) => {
    const horizon = coerceStoredGoalHorizon(g.horizon);
    const rawVp =
      "visionParentGoalId" in g &&
      typeof (g as Goal).visionParentGoalId === "string"
        ? (g as Goal).visionParentGoalId
        : null;
    return {
      ...g,
      horizon,
      longTermGoalId:
        horizon === "short_term"
          ? ((g as Goal).longTermGoalId ?? fallbackParentId)
          : null,
      visionParentGoalId:
        supportsOptionalVisionParent(horizon) && rawVp
          ? rawVp
          : null,
      area: migrateLegacyGoalArea(
        g.area as string | null | undefined,
      ),
    };
  });
}

function loadStored(): Goal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return coerceStoredGoals(parsed as Goal[]);
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
  /** Required when horizon is short_term (must be an existing long-term goal id). */
  longTermGoalId?: string | null;
  /** Optional when horizon is long_term — any 5/10/20y vision goal. */
  visionParentGoalId?: string | null;
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
  longTermGoalId: string | null;
  visionParentGoalId: string | null;
  title: string;
  metric: string | null;
  targetDate: string | null;
  progress: number;
  status: GoalStatus;
  area: GoalArea | null;
  reviewNote: string | null;
  sortOrder: number;
}>;

/** Applies patches like the CRM UI expects (including horizon → sort_order rebucket). */
export function mergeGoalPatch(
  prevList: Goal[],
  id: string,
  patch: GoalUpdateInput,
): Goal[] {
  const today = new Date().toISOString().slice(0, 10);
  const sortedLongParents = [...prevList]
    .filter((x) => x.horizon === "long_term")
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  return prevList.map((g) => {
    if (g.id !== id) return g;
    const next: Goal = { ...g, updatedAt: today };
    if (patch.horizon !== undefined && patch.horizon !== g.horizon) {
      next.horizon = patch.horizon;
      const same = prevList.filter(
        (x) => x.horizon === patch.horizon && x.id !== id,
      );
      next.sortOrder =
        same.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1;

      if (patch.horizon === "short_term") {
        next.longTermGoalId =
          patch.longTermGoalId ??
          sortedLongParents[0]?.id ??
          g.longTermGoalId ??
          null;
        next.visionParentGoalId = null;
      } else {
        next.longTermGoalId = null;
        if (patch.horizon === "long_term") {
          next.visionParentGoalId =
            patch.visionParentGoalId !== undefined
              ? patch.visionParentGoalId
              : null;
        } else {
          next.visionParentGoalId = null;
        }
      }
    }

    if (patch.longTermGoalId !== undefined && next.horizon === "short_term") {
      next.longTermGoalId = patch.longTermGoalId;
    }

    if (
      patch.visionParentGoalId !== undefined &&
      next.horizon === "long_term"
    ) {
      next.visionParentGoalId = patch.visionParentGoalId;
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

    if (next.horizon !== "short_term") next.longTermGoalId = null;
    if (next.horizon !== "long_term") next.visionParentGoalId = null;

    return next;
  });
}

function goalSyncPayload(g: Goal) {
  return {
    horizon: g.horizon,
    longTermGoalId: g.longTermGoalId,
    visionParentGoalId: g.visionParentGoalId,
    title: g.title,
    metric: g.metric,
    targetDate: g.targetDate,
    progress: g.progress,
    status: g.status,
    area: g.area,
    reviewNote: g.reviewNote,
    sortOrder: g.sortOrder,
  };
}

type GoalsContextValue = {
  goals: Goal[];
  /** True when goals list is loaded from Neon via GET /api/goals */
  neonBacked: boolean;
  hydrated: boolean;
  /**
   * Signed in but GET /api/goals did not succeed — edits use browser-only storage
   * until load succeeds (see `goalsLoadError` and `retryGoalsFromApi`).
   */
  goalsApiUnreachable: boolean;
  /** Server-provided hint when goals failed to load (HTTP body `error`). */
  goalsLoadError: string | null;
  /** Try loading goals from the API again (after fixing env / schema). */
  retryGoalsFromApi: () => void;
  addGoal: (input: NewGoalInput) => Promise<{
    ok: boolean;
    error?: string | null;
  }>;
  updateGoal: (id: string, patch: GoalUpdateInput) => void;
  deleteGoal: (id: string) => void;
};

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [neonBacked, setNeonBacked] = useState(false);
  const [goalsApiUnreachable, setGoalsApiUnreachable] = useState(false);
  const [goalsLoadError, setGoalsLoadError] = useState<string | null>(null);
  const remoteRef = useRef(false);
  const goalsRef = useRef<Goal[]>([]);

  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const result = await bootstrapGoalsFromApi();
        if (cancelled) return;

        switch (result.kind) {
          case "neon":
            remoteRef.current = true;
            setNeonBacked(true);
            setGoalsApiUnreachable(false);
            setGoalsLoadError(null);
            setGoals(result.goals);
            setHydrated(true);
            return;
          case "failed":
            remoteRef.current = false;
            setNeonBacked(false);
            setGoalsApiUnreachable(true);
            setGoalsLoadError(
              result.message?.trim() ||
                `Could not load goals (HTTP ${result.httpStatus}).`,
            );
            setGoals([]);
            setHydrated(true);
            return;
          case "anonymous":
            break;
        }
      } catch {
        /* fall through to anonymous handling */
      }

      if (cancelled) return;
      remoteRef.current = false;
      setNeonBacked(false);
      setGoalsApiUnreachable(false);
      setGoalsLoadError(null);
      setGoals(loadStored() ?? []);
      setHydrated(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const retryGoalsFromApi = useCallback(() => {
    void bootstrapGoalsFromApi().then((result) => {
      switch (result.kind) {
        case "neon":
          remoteRef.current = true;
          setNeonBacked(true);
          setGoalsApiUnreachable(false);
          setGoalsLoadError(null);
          setGoals(result.goals);
          return;
        case "failed":
          remoteRef.current = false;
          setNeonBacked(false);
          setGoalsApiUnreachable(true);
          setGoalsLoadError(
            result.message?.trim() ||
              `Could not load goals (HTTP ${result.httpStatus}).`,
          );
          setGoals([]);
          return;
        case "anonymous":
          remoteRef.current = false;
          setNeonBacked(false);
          setGoalsApiUnreachable(false);
          setGoalsLoadError(null);
          setGoals(loadStored() ?? []);
      }
    });
  }, []);

  useEffect(() => {
    if (!hydrated || neonBacked) return;
    persist(goals);
  }, [goals, hydrated, neonBacked]);

  const addGoal = useCallback(
    async (
      input: NewGoalInput,
    ): Promise<{ ok: boolean; error?: string | null }> => {
    if (!remoteRef.current) {
      setGoals((prev) => {
        const sameHorizon = prev.filter((g) => g.horizon === input.horizon);
        const maxOrder = sameHorizon.reduce(
          (m, g) => Math.max(m, g.sortOrder),
          -1,
        );
        const row: Goal = {
          id: genId(),
          horizon: input.horizon,
          longTermGoalId: needsStrategicParent(input.horizon)
            ? (input.longTermGoalId ?? null)
            : null,
          visionParentGoalId: supportsOptionalVisionParent(input.horizon)
            ? input.visionParentGoalId?.trim() || null
            : null,
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
      return { ok: true };
    }

    const prev = goalsRef.current;
    const sameHorizon = prev.filter((g) => g.horizon === input.horizon);
    const maxOrder = sameHorizon.reduce(
      (m, g) => Math.max(m, g.sortOrder),
      -1,
    );
    const rowToSend: Goal = {
      id: genId(),
      horizon: input.horizon,
      longTermGoalId: needsStrategicParent(input.horizon)
        ? (input.longTermGoalId ?? null)
        : null,
      visionParentGoalId: supportsOptionalVisionParent(input.horizon)
        ? input.visionParentGoalId?.trim() || null
        : null,
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
    const next = [...prev, rowToSend];
    goalsRef.current = next;
    setGoals(next);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rowToSend.id,
          ...goalSyncPayload(rowToSend),
        }),
      });

      if (!res.ok) {
        setGoals((p) => p.filter((g) => g.id !== rowToSend.id));
        let message: string | null = null;
        try {
          const b = (await res.json()) as { error?: string };
          if (typeof b.error === "string") message = b.error;
        } catch {
          /* non-JSON body */
        }
        return { ok: false, error: message };
      }

      const data = (await res.json()) as { goal?: Goal };
      if (data.goal) {
        setGoals((p) =>
          p.map((g) => (g.id === rowToSend.id ? data.goal! : g)),
        );
      }
      return { ok: true };
    } catch {
      setGoals((p) => p.filter((g) => g.id !== rowToSend.id));
      return {
        ok: false,
        error: "Could not reach the server. Check your connection and try again.",
      };
    }
  },
  [],
);

  const updateGoal = useCallback((id: string, patch: GoalUpdateInput) => {
    if (!remoteRef.current) {
      setGoals((prev) => mergeGoalPatch(prev, id, patch));
      return;
    }

    let merged: Goal | null = null;
    setGoals((prev) => {
      const next = mergeGoalPatch(prev, id, patch);
      merged = next.find((g) => g.id === id) ?? null;
      return next;
    });

    if (!merged) return;

    void (async () => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalSyncPayload(merged!)),
      });

      if (!res.ok) {
        try {
          const listRes = await fetch("/api/goals", {
            credentials: "include",
            cache: "no-store",
          });
          if (listRes.ok) {
            const body = (await listRes.json()) as { goals?: Goal[] };
            if (Array.isArray(body.goals)) setGoals(body.goals);
          }
        } catch {
          /* ignore */
        }
        return;
      }

      const data = (await res.json()) as { goal?: Goal };
      if (data.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? data.goal! : g)),
        );
      }
    })();
  }, []);

  const deleteGoal = useCallback((id: string) => {
    if (!remoteRef.current) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      return;
    }

    void (async () => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      goals,
      neonBacked,
      hydrated,
      goalsApiUnreachable,
      goalsLoadError,
      retryGoalsFromApi,
      addGoal,
      updateGoal,
      deleteGoal,
    }),
    [
      goals,
      neonBacked,
      hydrated,
      goalsApiUnreachable,
      goalsLoadError,
      retryGoalsFromApi,
      addGoal,
      updateGoal,
      deleteGoal,
    ],
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
