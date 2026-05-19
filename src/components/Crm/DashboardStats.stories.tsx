import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListTodo, TrendingUp, Users } from "lucide-react";

import { StatCard } from "./StatCard";
import { customers, deals, tasks } from "@/lib/crm/mock-data";
import { formatEur } from "@/lib/format";

function DashboardStatsDemo() {
  const openPipeline = deals.filter(
    (d) => d.stage !== "won" && d.stage !== "lost",
  );
  const weightedPipeline = openPipeline.reduce(
    (sum, d) => sum + d.valueEur * (d.probability / 100),
    0,
  );
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <div className="dashboard-focus grid gap-4 md:grid-cols-3">
      <StatCard
        title="Weighted pipeline"
        value={formatEur(Math.round(weightedPipeline))}
        hint="Fantasy meets spreadsheets - probability-adjusted."
        icon={TrendingUp}
        trend={{
          label: `${openPipeline.length} deals still pretending closure is "soon"`,
          positive: true,
        }}
        className="border-white/[0.05]"
      />
      <StatCard
        title="Retainers & fees"
        value={formatEur(
          customers.reduce((s, c) => s + (c.feeEur ?? 0), 0),
        )}
        hint={`${customers.length} relationship${customers.length === 1 ? "" : "s"} bankrolling Wi-Fi`}
        icon={Users}
        trend={{ label: "Recurring beats heroic", positive: true }}
        className="border-white/[0.05]"
      />
      <StatCard
        title="Open loops"
        value={`${openTasks}`}
        hint="Still yours until the checkbox says otherwise."
        icon={ListTodo}
        trend={{ label: "Done beats perfect", positive: true }}
        className="border-white/[0.05]"
      />
    </div>
  );
}

const meta = {
  title: "CRM/Dashboard stats grid",
  component: DashboardStatsDemo,
  tags: ["autodocs"],
} satisfies Meta<typeof DashboardStatsDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThreeTiles: Story = {
  render: () => <DashboardStatsDemo />,
};
