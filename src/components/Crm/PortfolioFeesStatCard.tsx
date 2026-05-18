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
      title="Retainers & fees"
      value={formatEur(total)}
      hint={`${customers.length} relationship${customers.length === 1 ? "" : "s"} bankrolling Wi-Fi`}
      icon={Users}
      trend={{ label: "Recurring beats heroic", positive: true }}
      className="border-white/[0.05]"
    />
  );
}
