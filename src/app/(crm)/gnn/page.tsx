import { CrmPage } from "@/components/Crm/CrmPage";
import { GnnPageClient } from "@/components/Crm/GnnPageClient";

export default function GnnPage() {
  return (
    <CrmPage
      title="GNN"
      subtitle="Minimal graph neural network lab. Visualize CRM entities as nodes, run a JavaScript GCN forward pass, and compare with a Python reference."
    >
      <GnnPageClient />
    </CrmPage>
  );
}
