import type { Metadata } from "next";

import { CrmPage } from "@/components/Crm/CrmPage";
import { PricingPage } from "@/components/Marketing/PricingPage";

export const metadata: Metadata = {
  title: "Subscription",
  description:
    "NordFlow pricing - Free for ~50 contacts or Pro from €8-€12/month for unlimited contacts, pipeline, tasks, and export.",
};

export default function PricingRoute() {
  return (
    <CrmPage
      title="Subscription"
      subtitle="Plans for independent grant consultants - follow-ups, pipeline, reminders, and export without spreadsheet chaos."
    >
      <PricingPage variant="app" />
    </CrmPage>
  );
}
