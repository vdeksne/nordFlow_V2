import { goalHorizonBadge } from "@/lib/crm/goal-horizons";
import type {
  Company,
  Contact,
  Deal,
  Goal,
  Invoice,
  Lead,
  Task,
} from "@/lib/crm/types";

export type RelatedLookups = {
  deals: Deal[];
  companies: Company[];
  leads: Lead[];
  contacts: Contact[];
  goals: Goal[];
};

/** Single-line label for tasks board / priorities (freelancer CRM linking). */
export function formatTaskRelatedLine(task: Task, ctx: RelatedLookups): string {
  if (task.relatedKind === "none" || task.relatedId == null || task.relatedId === "") {
    return "General · Inbox";
  }

  if (task.relatedKind === "deal") {
    const d = ctx.deals.find((x) => x.id === task.relatedId);
    return d ? `Deal · ${d.company}` : `Deal · ${task.relatedId}`;
  }

  if (task.relatedKind === "company") {
    const c = ctx.companies.find((x) => x.id === task.relatedId);
    return c ? `Company · ${c.name}` : `Company · ${task.relatedId}`;
  }

  if (task.relatedKind === "lead") {
    const l = ctx.leads.find((x) => x.id === task.relatedId);
    return l ? `Lead · ${l.company}` : `Lead · ${task.relatedId}`;
  }

  if (task.relatedKind === "contact") {
    const c = ctx.contacts.find((x) => x.id === task.relatedId);
    if (!c) return `Contact · ${task.relatedId}`;
    const co = ctx.companies.find((x) => x.id === c.companyId);
    return co ? `Contact · ${c.name} · ${co.name}` : `Contact · ${c.name}`;
  }

  if (task.relatedKind === "goal") {
    const g = ctx.goals.find((x) => x.id === task.relatedId);
    if (!g) return `Goal · ${task.relatedId ?? "…"}`;
    const badge = goalHorizonBadge(g.horizon);
    const short =
      g.title.length > 44 ? `${g.title.slice(0, 42)}…` : g.title;
    return `Goal · ${badge} · ${short}`;
  }

  return "General · Inbox";
}

/** Invoice label for compact lists */
export function formatInvoiceLine(inv: Invoice, companies: Company[]): string {
  const co = companies.find((c) => c.id === inv.companyId);
  const name = co?.name ?? inv.companyId;
  return `${name} · ${inv.status} · €${Math.round(inv.amountEur)}`;
}
