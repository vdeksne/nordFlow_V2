"use client";

import { Flame, Orbit, Zap, type LucideIcon } from "lucide-react";
import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Ui/Card";
import type { Deal, DealStage, Lead } from "@/lib/crm/types";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useCustomers } from "./CustomersContext";
import { useTasks } from "./TasksContext";

type DashboardChartsProps = {
  deals: Deal[];
  leads: Lead[];
  /** `lean` hides the chart wall - trajectory + revenue mix only. */
  density?: "full" | "lean";
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const STAGE_ORDER: DealStage[] = [
  "lead",
  "contacted",
  "discovery_call",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

function stageLabel(s: DealStage): string {
  const labels: Record<DealStage, string> = {
    lead: "Lead",
    contacted: "Contacted",
    discovery_call: "Discovery call",
    proposal_sent: "Proposal sent",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
  };
  return labels[s];
}

function scatterStageFill(stage: Deal["stage"]) {
  switch (stage) {
    case "won":
      return CHART_COLORS[1];
    case "negotiation":
      return CHART_COLORS[0];
    case "proposal_sent":
      return CHART_COLORS[2];
    case "discovery_call":
      return CHART_COLORS[3];
    case "contacted":
      return CHART_COLORS[4];
    case "lead":
      return "var(--chart-5)";
    default:
      return CHART_COLORS[4];
  }
}

type BubbleDealDatum = {
  id: string;
  prob: number;
  value: number;
  z: number;
  company: string;
  stage: string;
  title: string;
};

function ScatterDealTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: BubbleDealDatum }[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div className="border-sidebar-border z-50 max-w-[240px] rounded-xl border border-white/[0.1] bg-[color-mix(in_oklab,var(--popover)_94%,transparent)] px-3 py-2.5 text-xs shadow-xl backdrop-blur-xl">
      <p className="text-foreground font-semibold leading-snug">{d.company}</p>
      <p className="text-muted-foreground mt-0.5">{stageLabel(d.stage as DealStage)}</p>
      <p className="text-foreground mt-2 tabular-nums font-medium">
        {formatEur(Math.round(d.value))}
        <span className="text-muted-foreground font-normal">
          {" "}
          · {d.prob}% probability
        </span>
      </p>
      <p className="text-muted-foreground mt-1 line-clamp-2 text-[10px] leading-snug">
        {d.title}
      </p>
    </div>
  );
}

function formatMonthTick(m: string) {
  if (!m || m === "-") return m;
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  return new Date(y, mo - 1).toLocaleString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-sidebar-border z-50 rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--popover)_92%,transparent)] px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
      <p className="text-muted-foreground mb-1 font-medium tracking-wide uppercase">
        {label}
      </p>
      <ul className="space-y-1">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 tabular-nums">
            <span
              className="size-2 shrink-0 rounded-none"
              style={{ background: p.color ?? "var(--primary)" }}
              aria-hidden
            />
            <span className="text-foreground font-medium">
              {typeof p.value === "number" ? formatEur(Math.round(p.value)) : p.value}
            </span>
            <span className="text-muted-foreground">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GaugeRing({
  value,
  label,
  hint,
  icon: Icon,
}: {
  value: number;
  label: string;
  hint: string;
  icon: LucideIcon;
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = c * (1 - pct / 100);

  return (
    <div className="relative flex flex-col items-center gap-2 rounded-none border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center">
      <div
        className="text-primary relative size-[92px] shrink-0"
        role="img"
        aria-label={`${label} ${pct} percent`}
      >
        <svg className="-rotate-90 size-full" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            className="stroke-white/[0.06]"
            strokeWidth="8"
          />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
          />
        </svg>
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0">
          <Icon className="text-primary/90 mb-0.5 size-5" aria-hidden />
          <span className="text-foreground text-lg font-semibold tabular-nums">
            {pct}
          </span>
          <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
            pts
          </span>
        </span>
      </div>
      <p className="text-foreground text-[11px] font-semibold tracking-tight">
        {label}
      </p>
      <p className="text-muted-foreground max-w-[10rem] text-[10px] leading-snug">
        {hint}
      </p>
    </div>
  );
}

export function DashboardCharts({
  deals,
  leads,
  density = "full",
}: DashboardChartsProps) {
  const { customers } = useCustomers();
  const { tasks } = useTasks();
  const gid = useId().replace(/:/g, "");

  const portfolioFees = useMemo(
    () => customers.reduce((s, c) => s + (c.feeEur ?? 0), 0),
    [customers],
  );

  const {
    openPipeline,
    weightedOpen,
    wonSum,
    pipelineByStage,
    pieSlices,
    trajectory,
    leadFunnel,
    executionScore,
    winMixScore,
    funnelHeatScore,
    dealBubbleData,
    closeMonthMomentum,
    radarSpectrum,
  } = useMemo(() => {
    const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
    const weighted = open.reduce(
      (s, d) => s + d.valueEur * (d.probability / 100),
      0,
    );
    const won = deals
      .filter((d) => d.stage === "won")
      .reduce((s, d) => s + d.valueEur, 0);

    const byStage = STAGE_ORDER.filter((s) => s !== "won" && s !== "lost").map(
      (stage) => ({
        stage: stageLabel(stage),
        key: stage,
        value: open
          .filter((d) => d.stage === stage)
          .reduce((s, d) => s + d.valueEur, 0),
        weighted: open
          .filter((d) => d.stage === stage)
          .reduce((s, d) => s + d.valueEur * (d.probability / 100), 0),
      }),
    );

    const leadTotal = leads.reduce((s, l) => s + l.valueEur, 0);

    const pie = [
      {
        name: "Booked wins",
        value: Math.max(0, won),
      },
      {
        name: "Recurring fees",
        value: Math.max(0, portfolioFees),
      },
      {
        name: "Weighted pipeline",
        value: Math.max(0, Math.round(weighted)),
      },
      {
        name: "Lead upside",
        value: Math.max(0, leadTotal),
      },
    ].filter((p) => p.value > 0);

    const secured = portfolioFees + won;
    const peak = secured + weighted + leadTotal * 0.35;
    const steps = 10;
    const trajectoryRows = Array.from({ length: steps }, (_, i) => {
      const t = i / (steps - 1);
      const ease = 1 - Math.pow(1 - t, 2.35);
      const wave = 0.06 * Math.sin(i * 0.85);
      return {
        step: i === 0 ? "Today" : `${i}`,
        upside: Math.round(secured + (peak - secured) * ease * (1 + wave)),
        runway: Math.round(secured + weighted * ease * 0.92),
      };
    });

    const stageOrder: Lead["stage"][] = ["new", "contacted", "qualified", "lost"];
    const funnel = stageOrder
      .filter((s) => s !== "lost")
      .map((stage) => {
        const subset = leads.filter((l) => l.stage === stage);
        return {
          stage: stage.charAt(0).toUpperCase() + stage.slice(1),
          count: subset.length,
          value: subset.reduce((s, l) => s + l.valueEur, 0),
        };
      });

    const doneTasks = tasks.filter((t) => t.done).length;
    const executionScore = tasks.length
      ? Math.round((doneTasks / tasks.length) * 100)
      : 72;

    const winMixScore =
      deals.length > 0
        ? Math.round(
            (deals.filter((d) => d.stage === "won").length / deals.length) * 100,
          )
        : 0;

    const qualified = leads.filter((l) => l.stage === "qualified").length;
    const funnelHeatScore =
      leads.length > 0 ? Math.round((qualified / leads.length) * 100) : 55;

    const dealBubbleData: BubbleDealDatum[] = deals
      .filter((d) => d.stage !== "lost")
      .map((d) => ({
        id: d.id,
        prob: d.probability,
        value: d.valueEur,
        z: Math.round(Math.sqrt(d.valueEur) * (2 + d.probability / 35)),
        company: d.company,
        stage: d.stage,
        title: d.title,
      }));

    const closeBucket = new Map<string, { booked: number; weighted: number }>();
    for (const d of deals) {
      const month = d.closeDate.slice(0, 7);
      const cur = closeBucket.get(month) ?? { booked: 0, weighted: 0 };
      if (d.stage === "won") cur.booked += d.valueEur;
      else if (d.stage !== "lost") {
        cur.weighted += (d.valueEur * d.probability) / 100;
      }
      closeBucket.set(month, cur);
    }
    let closeMonthMomentum = [...closeBucket.keys()]
      .sort()
      .map((month) => ({
        month,
        booked: Math.round(closeBucket.get(month)!.booked),
        weighted: Math.round(closeBucket.get(month)!.weighted),
      }));
    if (closeMonthMomentum.length === 0) {
      closeMonthMomentum = [{ month: "-", booked: 0, weighted: 0 }];
    }

    const denomRadar = Math.max(weighted, leadTotal, portfolioFees, 1);
    const radarSpectrum = [
      {
        subject: "Weighted pipe",
        value: Math.round(Math.min(100, (weighted / denomRadar) * 100)),
      },
      {
        subject: "Lead upside",
        value: Math.round(Math.min(100, (leadTotal / denomRadar) * 100)),
      },
      {
        subject: "Fee base",
        value: Math.round(Math.min(100, (portfolioFees / denomRadar) * 100)),
      },
      {
        subject: "Task velocity",
        value: executionScore,
      },
      {
        subject: "Win mix",
        value: winMixScore,
      },
    ];

    return {
      openPipeline: open,
      weightedOpen: weighted,
      wonSum: won,
      pipelineByStage: byStage,
      pieSlices: pie,
      trajectory: trajectoryRows,
      leadFunnel: funnel,
      executionScore,
      winMixScore,
      funnelHeatScore,
      dealBubbleData,
      closeMonthMomentum,
      radarSpectrum,
    };
  }, [deals, leads, portfolioFees, tasks]);

  const pieData =
    pieSlices.length > 0
      ? pieSlices
      : [{ name: "Grow your picture slowly", value: 1 }];

  const scatterPlotData: BubbleDealDatum[] =
    dealBubbleData.length > 0
      ? dealBubbleData
      : [
          {
            id: "bubble-demo",
            prob: 48,
            value: 72000,
            z: 260,
            company: "Northstar Advisory",
            stage: "proposal_sent",
            title: "Expand pipeline - bubbles appear per live deal",
          },
        ];

  const scatterLegendStages = (
    ["lead", "contacted", "discovery_call", "proposal_sent", "negotiation", "won"] as const
  ).filter((s) => scatterPlotData.some((d) => d.stage === s));

  const axisTick = {
    fill: "var(--muted-foreground)",
    fontSize: 10,
    opacity: 0.85,
  };

  const lean = density === "lean";

  return (
    <section className="space-y-6">
      {lean ? (
        <div className="border-sidebar-border rounded-none border border-white/[0.05] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] px-4 py-3 backdrop-blur-md sm:px-5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide">
            <span className="text-primary font-semibold tracking-[0.18em] uppercase">
              Glance
            </span>
            {" · "}
            Breadth of security and upside—still life first, spreadsheets second.
          </p>
        </div>
      ) : (
        <div className="border-sidebar-border relative overflow-hidden rounded-none border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_82%,transparent)] p-6 backdrop-blur-md md:p-8">
          <div className="relative space-y-2">
            <p className="text-primary text-[10px] font-semibold tracking-[0.28em] uppercase">
              Momentum cockpit
            </p>
            <h2 className="text-foreground text-xl font-semibold tracking-tight md:text-2xl">
              See traction without letting it eclipse the rest of your life.
            </h2>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              Mix of booked work, repeating income, probability-weighted pipeline,
              and new conversations—grounded signals while you steer toward bigger
              goals.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-sidebar-border lg:col-span-8 overflow-hidden border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Stability vs stretch over time
            </CardTitle>
            <CardDescription>
              Stretch imagines fuller capacity; runway stays closer to weighted
              reality—income serves the life you&apos;re designing, not the other way
              around.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-2 pr-2 pb-4 pl-0">
            <ResponsiveContainer width="100%" height={292} minWidth={0}>
              <AreaChart
                data={trajectory}
                margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`${gid}-up`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.55}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id={`${gid}-run`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--chart-3)"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-3)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 8"
                  stroke="rgb(148 163 184 / 0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="step"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(148 163 184 / 0.12)" }}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `€${(v / 1_000_000).toFixed(1)}M`
                      : `€${Math.round(v / 1000)}k`
                  }
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<GlassTooltip />} cursor={{ strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="upside"
                  name="Stretch potential"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill={`url(#${gid}-up)`}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="runway"
                  name="Weighted runway"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  fill={`url(#${gid}-run)`}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border lg:col-span-4 flex flex-col border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Where value lives today
            </CardTitle>
            <CardDescription>
              Locked wins, retainers, pipeline, curious leads—nothing moralized,
              just composition.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[280px] flex-1 flex-col items-center justify-center pt-2">
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="transparent"
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        className="stroke-white/[0.04]"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {pieSlices.length > 0 ? (
              <ul className="mt-2 grid w-full gap-2 text-[11px]">
                {pieSlices.map((p, i) => (
                  <li
                    key={p.name}
                    className="text-muted-foreground flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-none"
                        style={{
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      {p.name}
                    </span>
                    <span className="text-foreground font-semibold tabular-nums">
                      {formatEur(Math.round(p.value))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-3 px-2 text-center text-xs leading-relaxed">
                As you log wins and relationships, this picture fills itself—money
                is one layer of momentum, not the whole scoreboard.
              </p>
            )}
          </CardContent>
        </Card>

        {!lean ? (
          <>
        <Card className="border-sidebar-border lg:col-span-6 border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Open pipeline · raw value
            </CardTitle>
            <CardDescription>
              Stage bars sized by deal value, chase the fat bars first.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] min-w-0 pt-2">
            <ResponsiveContainer width="100%" height={272} minWidth={0}>
              <BarChart
                data={pipelineByStage}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="4 8"
                  stroke="rgb(148 163 184 / 0.08)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `€${(v / 1_000_000).toFixed(1)}M`
                      : `€${Math.round(v / 1000)}k`
                  }
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(148 163 184 / 0.12)" }}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={92}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgb(148 163 184 / 0.06)" }} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={28}>
                  {pipelineByStage.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      className="opacity-95"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border lg:col-span-6 border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Lead funnel heat
            </CardTitle>
            <CardDescription>
              Count & attach value, warm up everything below “Qualified”.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] min-w-0 pt-2">
            <ResponsiveContainer width="100%" height={272} minWidth={0}>
              <BarChart
                data={leadFunnel}
                margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="4 8"
                  stroke="rgb(148 163 184 / 0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="stage"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(148 163 184 / 0.12)" }}
                />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgb(148 163 184 / 0.06)" }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={52}>
                  {leadFunnel.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border lg:col-span-8 overflow-hidden border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Deal constellation
            </CardTitle>
            <CardDescription>
              Probability vs deal size - bubble area scales with weighted conviction
              (mock pipeline + wins, excludes lost).
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[320px] pt-0 pb-4">
            <ResponsiveContainer width="100%" height={312} minWidth={0}>
              <ScatterChart margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="4 8"
                  stroke="rgb(148 163 184 / 0.08)"
                />
                <XAxis
                  type="number"
                  dataKey="prob"
                  name="Win probability"
                  domain={[0, 100]}
                  unit="%"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(148 163 184 / 0.12)" }}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name="Deal value"
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `€${(v / 1_000_000).toFixed(1)}M`
                      : `€${Math.round(v / 1000)}k`
                  }
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <ZAxis type="number" dataKey="z" range={[160, 780]} />
                <Tooltip
                  content={<ScatterDealTooltip />}
                  cursor={{ strokeDasharray: "4 4" }}
                />
                <Scatter name="Deals" data={scatterPlotData}>
                  {scatterPlotData.map((pt) => (
                    <Cell
                      key={pt.id}
                      fill={scatterStageFill(pt.stage as Deal["stage"])}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            {scatterLegendStages.length > 0 ? (
              <ul className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px] font-semibold tracking-wide uppercase">
                {scatterLegendStages.map((st) => (
                  <li key={st} className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        background: scatterStageFill(st),
                      }}
                      aria-hidden
                    />
                    {stageLabel(st)}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-sidebar-border lg:col-span-4 flex flex-col border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Momentum spectrum
            </CardTitle>
            <CardDescription>
              Five-axis pulse of pipe, leads, fees, tasks, and win mix - normalized
              to your largest revenue lever.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[320px] flex-1 flex-col items-center justify-center pb-4">
            <div className="h-[280px] w-full max-w-[340px]">
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <RadarChart data={radarSpectrum} outerRadius="78%">
                  <PolarGrid stroke="rgb(148 163 184 / 0.12)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      fill: "var(--muted-foreground)",
                      fontSize: 10,
                    }}
                  />
                  <PolarRadiusAxis
                    angle={36}
                    domain={[0, 100]}
                    tick={{
                      fill: "var(--muted-foreground)",
                      fontSize: 9,
                    }}
                    tickCount={4}
                  />
                  <Radar
                    name="Momentum"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="var(--chart-1)"
                    fillOpacity={0.22}
                    dot={{
                      r: 4,
                      fill: "var(--chart-1)",
                      strokeWidth: 0,
                    }}
                  />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="border-sidebar-border rounded-xl border border-white/[0.1] bg-[color-mix(in_oklab,var(--popover)_94%,transparent)] px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
                          <p className="text-foreground font-semibold">
                            {String(payload[0]?.payload?.subject ?? "")}
                          </p>
                          <p className="text-primary mt-1 tabular-nums">
                            {payload[0]?.value}%
                          </p>
                        </div>
                      ) : null
                    }
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border lg:col-span-12 border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Close-window rhythm
            </CardTitle>
            <CardDescription>
              Monthly booked wins vs weighted open forecast landing in the same
              close months - dual trajectory inspired by aligned timelines.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0 pt-2 pb-5">
            <ResponsiveContainer width="100%" height={284} minWidth={0}>
              <LineChart
                data={closeMonthMomentum}
                margin={{ top: 12, right: 18, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="4 8"
                  stroke="rgb(148 163 184 / 0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthTick}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(148 163 184 / 0.12)" }}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `€${(v / 1_000_000).toFixed(1)}M`
                      : `€${Math.round(v / 1000)}k`
                  }
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<GlassTooltip />} />
                <Line
                  type="monotone"
                  dataKey="booked"
                  name="Booked (won)"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 5, strokeWidth: 0, fill: "var(--chart-2)" }}
                  activeDot={{ r: 7, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="weighted"
                  name="Weighted forecast"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 5, strokeWidth: 0, fill: "var(--chart-1)" }}
                  activeDot={{ r: 7, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border lg:col-span-12 border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] shadow-none backdrop-blur-md">
          <CardHeader className="flex flex-col gap-1 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Execution scores
              </CardTitle>
              <CardDescription>
                Summary signals from completions, closes, and real
                conversations—you are more than these numbers.
              </CardDescription>
            </div>
            <p className="text-primary text-[10px] font-semibold tracking-[0.2em] uppercase">
              Close · nourish · widen
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <GaugeRing
                value={executionScore}
                label="Follow-through"
                hint="Checked-off vs total reminders—steady beats heroic sprints."
                icon={Zap}
              />
              <GaugeRing
                value={winMixScore}
                label="Earned closures"
                hint="Closed work as share of portfolio—grounds confidence."
                icon={Flame}
              />
              <GaugeRing
                value={funnelHeatScore}
                label="Warm conversations"
                hint="Qualified interest among leads—it is okay to prune the rest."
                icon={Orbit}
              />
            </div>
          </CardContent>
        </Card>
          </>
        ) : null}
      </div>

      <p
        className={cn(
          "text-muted-foreground/80 text-center text-[10px] tracking-[0.14em] uppercase",
          lean && "tracking-[0.12em]",
        )}
      >
        {lean ? (
          <>
            Booked wins · {formatEur(Math.round(wonSum))} · Weighted horizon ·{" "}
            {formatEur(Math.round(weightedOpen))} ·{" "}
            {openPipeline.length} commitments moving
          </>
        ) : (
          <>
            Booked wins · {formatEur(Math.round(wonSum))} · Weighted open ·{" "}
            {formatEur(Math.round(weightedOpen))} · {openPipeline.length} active deals ·
            Fees {formatEur(Math.round(portfolioFees))}
          </>
        )}
      </p>
    </section>
  );
}
