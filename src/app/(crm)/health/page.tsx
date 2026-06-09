import { CrmPage } from "@/components/Crm/CrmPage";
import { HealthPageClient } from "@/components/Crm/HealthPageClient";

export default function HealthPage() {
  return (
    <CrmPage
      title="Health"
      subtitle="Surgery prep, nutrition, and movement in one place. Plan weekly and monthly workouts, track a base diet rotation, set outcomes, and push steps to your task board when you are ready to execute."
    >
      <HealthPageClient />
    </CrmPage>
  );
}
