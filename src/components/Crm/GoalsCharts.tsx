"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Ui/Card";
import { GOAL_AREA_ORDER, goalAreaDomain } from "@/lib/crm/goal-areas";
import type { Goal, GoalArea, GoalHorizon } from "@/lib/crm/types";

const CHART_TOOLTIP =
  "border-sidebar-border z-50 max-w-[220px] rounded-xl border border-white/[0.1] bg-[color-mix(in_oklab,var(--popover)_94%,transparent)] px-3 py-2.5 text-xs shadow-xl backdrop-blur-xl";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const HORIZON_BAR_ORDER: { horizon: GoalHorizon; name: string }[] = [
  { horizon: "short_term", name: "Short-term" },
  { horizon: "long_term", name: "Strategic" },
  { horizon: "vision_5", name: "5-yr vision" },
  { horizon: "vision_10", name: "10-yr vision" },
  { horizon: "vision_20", name: "20-yr vision" },
];

function barHueForHorizon(h: GoalHorizon): string {
  switch (h) {
    case "short_term":
      return CHART_COLORS[0];
    case "long_term":
      return CHART_COLORS[2];
    case "vision_5":
      return CHART_COLORS[1];
    case "vision_10":
      return CHART_COLORS[3];
    case "vision_20":
      return CHART_COLORS[4];
    default: {
      const _never: never = h;
      return _never;
    }
  }
}

const AREA_ORDER: GoalArea[] = GOAL_AREA_ORDER;

function pillarLabel(area: GoalArea): string {
  return goalAreaDomain(area);
}

function avgProgressInArea(goals: Goal[], area: GoalArea): number {
  const rows = goals.filter((g) => g.area === area && g.status === "active");
  if (rows.length === 0) return 0;
  return Math.round(
    rows.reduce((s, g) => s + g.progress, 0) / rows.length,
  );
}

function meanProgress(goals: Goal[]): number {
  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) return 0;
  return Math.round(
    active.reduce((s, g) => s + g.progress, 0) / active.length,
  );
}

type GoalsChartsProps = {
  goals: Goal[];
};

export function GoalsCharts({ goals }: GoalsChartsProps) {
  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "active"),
    [goals],
  );

  const radarData = useMemo(
    () =>
      AREA_ORDER.map((area) => ({
        pillar: pillarLabel(area),
        score: avgProgressInArea(activeGoals, area),
        fullMark: 100,
      })),
    [activeGoals],
  );

  const statusData = useMemo(() => {
    const counts = { active: 0, completed: 0, archived: 0 } as Record<
      Goal["status"],
      number
    >;
    for (const g of goals) {
      counts[g.status] += 1;
    }
    return [
      { name: "Active", value: counts.active, fill: CHART_COLORS[0] },
      { name: "Completed", value: counts.completed, fill: CHART_COLORS[1] },
      { name: "Archived", value: counts.archived, fill: CHART_COLORS[3] },
    ].filter((d) => d.value > 0);
  }, [goals]);

  const horizonData = useMemo(() => {
    return HORIZON_BAR_ORDER.map(({ horizon, name }) => {
      const lane = goals.filter(
        (g) => g.horizon === horizon && g.status === "active",
      );
      return {
        name,
        horizon,
        avg: lane.length
          ? Math.round(
              lane.reduce((s, g) => s + g.progress, 0) / lane.length,
            )
          : 0,
        n: lane.length,
      };
    });
  }, [goals]);

  const rankedBars = useMemo(() => {
    return [...activeGoals]
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 10)
      .map((g) => ({
        id: g.id,
        label:
          g.title.length > 36 ? `${g.title.slice(0, 34)}…` : g.title,
        progress: g.progress,
        fill: barHueForHorizon(g.horizon),
      }));
  }, [activeGoals]);

  const hasAnyGoals = goals.length > 0;
  const overallActiveMean = meanProgress(activeGoals);

  if (!hasAnyGoals) {
    return (
      <section
        className="rounded-xl border border-dashed border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_45%,transparent)] px-6 py-14 text-center backdrop-blur-sm"
        aria-label="Goal charts"
      >
        <p className="text-muted-foreground text-sm">
          Charts light up once you have goals across any horizon — execution,
          strategy, or 5–20 year vision arcs.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Goal tracking charts">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">
            Signal
          </p>
          <h2 className="text-foreground mt-1 text-lg font-semibold tracking-tight">
            Progress geometry
          </h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Pillar balance, status mix, horizon pulse, and the goals that want
            attention next.
          </p>
        </div>
        <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
          Active avg ·{" "}
          <span className="text-foreground font-semibold">
            {overallActiveMean}%
          </span>
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_65%,transparent)] backdrop-blur-md xl:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Domain balance
            </CardTitle>
            <CardDescription>
              Mean progress on active goals across life domains — self, work,
              money, relationships, meaning, and body.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[min(52vw,280px)] min-h-[240px] pt-2 pb-4">
            {activeGoals.length === 0 ? (
              <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
                No active goals - complete or unarchive to see the wheel.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="78%"
                  data={radarData}
                >
                  <PolarGrid stroke="rgb(255 255 255 / 0.08)" />
                  <PolarAngleAxis
                    dataKey="pillar"
                    tick={{
                      fill: "var(--muted-foreground)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Avg %"
                    dataKey="score"
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className={CHART_TOOLTIP}>
                          <p className="text-foreground font-semibold">
                            {String(payload[0].payload.pillar)}
                          </p>
                          <p className="text-muted-foreground mt-1 tabular-nums">
                            Avg · {payload[0].value}%
                          </p>
                        </div>
                      ) : null
                    }
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_65%,transparent)] backdrop-blur-md xl:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Attention queue
            </CardTitle>
            <CardDescription>
              Active goals ranked by progress - lowest first, so nothing quiet
              slips.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[min(52vw,280px)] min-h-[240px] pt-2 pb-2">
            {rankedBars.length === 0 ? (
              <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm">
                No active goals in the ladder.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={rankedBars}
                  margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{
                      fill: "var(--muted-foreground)",
                      fontSize: 10,
                    }}
                    axisLine={{ stroke: "rgb(255 255 255 / 0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={118}
                    tick={{
                      fill: "var(--muted-foreground)",
                      fontSize: 9.5,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className={CHART_TOOLTIP}>
                          <p className="text-foreground max-w-[200px] text-[11px] font-semibold leading-snug">
                            {String(payload[0].payload.label)}
                          </p>
                          <p className="text-muted-foreground mt-1 font-mono tabular-nums">
                            {payload[0].value}%
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="progress" radius={[0, 6, 6, 0]} maxBarSize={14}>
                    {rankedBars.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_65%,transparent)] backdrop-blur-md xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Status mix
            </CardTitle>
            <CardDescription>
              Portfolio of outcomes - archive without guilt, complete with
              ceremony.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-[min(52vw,280px)] min-h-[240px] flex-col items-center justify-center pt-2 pb-4">
            {statusData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No slices yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className={CHART_TOOLTIP}>
                          <p className="text-foreground font-semibold">
                            {String(payload[0].name)}
                          </p>
                          <p className="text-muted-foreground mt-1 tabular-nums">
                            {payload[0].value} goal
                            {Number(payload[0].value) === 1 ? "" : "s"}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <ul className="text-muted-foreground mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] font-medium">
              {statusData.map((s) => (
                <li key={s.name} className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: s.fill }}
                  />
                  {s.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_65%,transparent)] backdrop-blur-md xl:col-span-12">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Horizon pulse
            </CardTitle>
            <CardDescription>
              Mean progress on active goals across every horizon lane —
              execution through strategic and 5–20 year vision rows. Tooltip
              shows headcount per lane.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[140px] min-h-[180px] pt-2 pb-4 md:min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={horizonData}
                margin={{ top: 12, right: 4, left: 4, bottom: 32 }}
              >
                <XAxis
                  dataKey="name"
                  angle={-32}
                  textAnchor="end"
                  interval={0}
                  height={48}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  axisLine={{ stroke: "rgb(255 255 255 / 0.08)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className={CHART_TOOLTIP}>
                        <p className="text-foreground font-semibold">
                          {String(payload[0].payload.name)}
                        </p>
                        <p className="text-muted-foreground mt-1 tabular-nums">
                          Avg · {payload[0].payload.avg}%
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">
                          {payload[0].payload.n} active
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Bar
                  dataKey="avg"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={56}
                >
                  {horizonData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={barHueForHorizon(HORIZON_BAR_ORDER[i]!.horizon)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
