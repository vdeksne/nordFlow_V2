"use client";

import { ArrowUpRight, Briefcase, TrendingUp, Zap } from "lucide-react";

import { CrmPage } from "@/components/Crm/CrmPage";
import { DashboardCharts } from "@/components/Crm/DashboardCharts";
import { DashboardPrioritiesSection } from "@/components/Crm/DashboardPriorities";
import { useDeals } from "@/components/Crm/DealsContext";
import { useLeads } from "@/components/Crm/LeadsContext";
import { OpenTasksStatCard } from "@/components/Crm/OpenTasksStatCard";
import { PortfolioFeesStatCard } from "@/components/Crm/PortfolioFeesStatCard";
import { StatCard } from "@/components/Crm/StatCard";
import { Badge } from "@/components/Ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Ui/Table";
import { formatEur } from "@/lib/format";

export function DashboardPageClient() {
  const { deals } = useDeals();
  const { leads } = useLeads();

  const openPipeline = deals.filter(
    (d) => d.stage !== "won" && d.stage !== "lost",
  );
  const pipelineValue = openPipeline.reduce((sum, d) => sum + d.valueEur, 0);
  const weightedPipeline = openPipeline.reduce(
    (sum, d) => sum + d.valueEur * (d.probability / 100),
    0,
  );

  const spotlight = [...leads]
    .sort((a, b) => b.valueEur - a.valueEur)
    .slice(0, 4);

  return (
    <CrmPage
      title="Freelancer desk"
      subtitle="Knock out the top three tasks, then chase money. Everything else is cosplay."
    >
      <div className="dashboard-focus space-y-8 sm:space-y-10">
        <DashboardPrioritiesSection />

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-primary/8 text-primary inline-flex size-9 items-center justify-center rounded-full ring-1 ring-white/[0.06]">
                <Zap className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.22em] uppercase">
                  Runway
                </p>
                <p className="text-foreground text-base font-semibold tracking-tight">
                  Numbers that judge you lovingly
                </p>
              </div>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Weighted pipeline"
              value={formatEur(Math.round(weightedPipeline))}
              hint="Fantasy meets spreadsheets — probability-adjusted."
              icon={TrendingUp}
              trend={{
                label: `${openPipeline.length} deals still pretending closure is "soon"`,
                positive: true,
              }}
              className="border-white/[0.05]"
            />
            <PortfolioFeesStatCard />
            <OpenTasksStatCard />
          </section>
        </div>

        <DashboardCharts deals={deals} leads={leads} density="lean" />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="border-white/[0.05] bg-[color-mix(in_oklab,var(--card)_94%,transparent)] backdrop-blur-md">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">
                  Deals in motion
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Highest-value stuff before it ghosts you.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="rounded-none">
                <Briefcase className="mr-1" aria-hidden />
                Pipeline
              </Badge>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground px-6">
                      Deal
                    </TableHead>
                    <TableHead className="text-muted-foreground">Stage</TableHead>
                    <TableHead className="text-muted-foreground text-right">
                      Value
                    </TableHead>
                    <TableHead className="text-muted-foreground text-right">
                      Close
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openPipeline.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="border-sidebar-border hover:bg-muted/25"
                    >
                      <TableCell className="px-6 font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span>{deal.title}</span>
                          <span className="text-muted-foreground text-xs">
                            {deal.company}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{deal.stage}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEur(deal.valueEur)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {deal.closeDate}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-white/[0.05] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">
                Side quests & inbox bait
              </CardTitle>
              <CardDescription>
                Raw pipe plus leads worth answering before they go cold.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div className="flex items-start justify-between gap-3 rounded-none border border-white/[0.06] bg-muted/25 px-4 py-3">
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
                    Unweighted fantasy total
                  </p>
                  <p className="text-lg font-semibold tracking-tight">
                    {formatEur(pipelineValue)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Before probability rains on your parade.
                  </p>
                </div>
                <ArrowUpRight className="text-primary size-5 shrink-0" aria-hidden />
              </div>

              <div>
                <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-[0.18em] uppercase">
                  Warm-ish leads
                </p>
                <div className="space-y-2">
                  {spotlight.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between border border-white/[0.05] bg-gradient-to-r from-primary/[0.04] to-transparent px-3 py-2 transition-colors hover:border-primary/18"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.company}</p>
                        <p className="text-muted-foreground truncate text-xs capitalize">
                          {lead.stage} · {lead.owner.split(" ")[0]}
                        </p>
                      </div>
                      <span className="text-primary shrink-0 text-sm font-semibold tabular-nums">
                        {formatEur(lead.valueEur)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </CrmPage>
  );
}
