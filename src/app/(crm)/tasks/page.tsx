import { CrmPage } from "@/components/Crm/CrmPage";
import { TasksBoard } from "@/components/Crm/TasksBoard";

export default function TasksPage() {
  return (
    <CrmPage
      title="Tasks"
      subtitle="Quiet list for commitments that actually matter—to your goals, relationships, craft, or income. Enough structure to execute; enough space for a life."
    >
      <TasksBoard />
    </CrmPage>
  );
}
