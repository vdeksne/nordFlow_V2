export type HealthPillar = "surgery" | "nutrition" | "movement";

export type HealthPriority = "low" | "medium" | "high";

export type HealthGoal = {
  id: string;
  pillar: HealthPillar;
  title: string;
  metric: string | null;
  targetDate: string | null;
  progress: number;
  notes: string | null;
  status: "active" | "done";
};

export type HealthAction = {
  id: string;
  pillar: HealthPillar;
  goalId: string | null;
  title: string;
  dueAt: string | null;
  priority: HealthPriority;
  done: boolean;
  notes: string | null;
};

export const HEALTH_PILLARS: {
  id: HealthPillar;
  label: string;
  hint: string;
  accent: string;
}[] = [
  {
    id: "surgery",
    label: "Surgery & recovery",
    hint: "Procedures, prep, rehab milestones",
    accent:
      "border-rose-400/30 bg-rose-500/[0.08] text-rose-100/95",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    hint: "Diet fixes, meal rhythm, supplements",
    accent:
      "border-lime-400/30 bg-lime-500/[0.08] text-lime-100/95",
  },
  {
    id: "movement",
    label: "Movement",
    hint: "Training, walks, physiotherapy",
    accent:
      "border-cyan-400/30 bg-cyan-500/[0.08] text-cyan-100/95",
  },
];

export function healthPillarMeta(id: HealthPillar) {
  return HEALTH_PILLARS.find((p) => p.id === id)!;
}

export function clampHealthProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function isHealthPillar(v: unknown): v is HealthPillar {
  return v === "surgery" || v === "nutrition" || v === "movement";
}
