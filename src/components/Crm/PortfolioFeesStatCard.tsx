"use client";

import { Users } from "lucide-react";

import { StatCard } from "@/components/Crm/StatCard";
import { useCustomers } from "@/components/Crm/CustomersContext";
import { formatEur } from "@/lib/format";

export function PortfolioFeesStatCard() {
  const { customers } = useCustomers();
  const total = customers.reduce((sum, c) => sum + (c.feeEur ?? 0), 0);

  return (
    <StatCard
      title="Steady client income"
      value={formatEur(total)}
      hint={`${customers.length} ongoing relationship${customers.length === 1 ? "" : "s"} smoothing the baseline.`}
      icon={Users}
      trend={{ label: "Rhythm frees room for ambitious goals", positive: true }}
      className="border-white/[0.05]"
    />
  );
}
