"use client";

import { CrmPage } from "@/components/Crm/CrmPage";
import { DashboardDailyReminder } from "@/components/Crm/DashboardDailyReminder";
import { DashboardPrioritiesSection } from "@/components/Crm/DashboardPriorities";

export function DashboardPageClient() {
  return (
    <CrmPage
      title="Your desk"
      subtitle="Top priorities across today, this week, the month, and the year."
    >
      <div className="dashboard-focus mx-auto max-w-6xl space-y-8 sm:space-y-10">
        <DashboardDailyReminder />
        <DashboardPrioritiesSection />
      </div>
    </CrmPage>
  );
}
