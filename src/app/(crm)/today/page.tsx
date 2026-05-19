import { CrmPage } from "@/components/Crm/CrmPage";
import { TodayPageClient } from "@/components/Crm/TodayPageClient";

export default function TodayPage() {
  return (
    <CrmPage
      title="Today"
      subtitle="Time-block what matters: schedule deep work, catch overdue items early, and capture tasks in one motion."
    >
      <TodayPageClient />
    </CrmPage>
  );
}
