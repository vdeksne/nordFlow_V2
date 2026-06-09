"use client";

import type { GoalHorizon, TaskRelatedKind } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { useCompanies } from "./CompaniesContext";
import { useContacts } from "./ContactsContext";
import { useDeals } from "./DealsContext";
import { useGoals } from "./GoalsContext";
import { useLeads } from "./LeadsContext";

const KIND_OPTIONS: { value: TaskRelatedKind; label: string }[] = [
  { value: "none", label: "General / inbox" },
  { value: "goal", label: "Goal" },
  { value: "deal", label: "Deal" },
  { value: "company", label: "Company" },
  { value: "lead", label: "Lead" },
  { value: "contact", label: "Contact" },
];

function goalHorizonRank(h: GoalHorizon): number {
  switch (h) {
    case "short_term":
      return 0;
    case "one_year":
      return 1;
    case "long_term":
      return 2;
    case "vision_5":
      return 3;
    case "vision_10":
      return 4;
    case "vision_20":
      return 5;
    default: {
      const _n: never = h;
      return _n;
    }
  }
}

const selectClass =
  "border-input bg-[color-mix(in_oklab,var(--card)_55%,transparent)] h-10 w-full rounded-none border border-white/[0.08] px-3 text-sm text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]";

export type TaskRelatedFieldsProps = {
  relatedKind: TaskRelatedKind;
  relatedId: string | null;
  onRelatedKindChange: (k: TaskRelatedKind) => void;
  onRelatedIdChange: (id: string | null) => void;
};

export function TaskRelatedFields({
  relatedKind,
  relatedId,
  onRelatedKindChange,
  onRelatedIdChange,
}: TaskRelatedFieldsProps) {
  const { deals } = useDeals();
  const { companies } = useCompanies();
  const { leads } = useLeads();
  const { contacts } = useContacts();
  const { goals } = useGoals();

  const sortedGoals = [...goals].sort((a, b) => {
    const hr = goalHorizonRank(a.horizon) - goalHorizonRank(b.horizon);
    if (hr !== 0) return hr;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const sortedDeals = [...deals].sort((a, b) => a.company.localeCompare(b.company));
  const sortedCompanies = [...companies].sort((a, b) => a.name.localeCompare(b.name));
  const sortedLeads = [...leads].sort((a, b) => a.company.localeCompare(b.company));
  const sortedContacts = [...contacts].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-muted-foreground text-xs font-medium">Link to</span>
        <select
          className={cn(selectClass)}
          value={relatedKind}
          onChange={(e) => {
            const k = e.target.value as TaskRelatedKind;
            onRelatedKindChange(k);
            onRelatedIdChange(null);
          }}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {relatedKind === "goal" ? (
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-medium">
            Goal
          </span>
          {sortedGoals.length === 0 ? (
            <>
              <select className={cn(selectClass)} disabled value="">
                <option value="">
                  No goals yet - create some on the Goals page
                </option>
              </select>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Tasks can link to a goal once you&apos;ve defined outcomes on{" "}
                <strong className="text-foreground font-semibold">Goals</strong>.
              </p>
            </>
          ) : (
            <>
              <select
                className={cn(selectClass)}
                value={relatedId ?? ""}
                onChange={(e) =>
                  onRelatedIdChange(e.target.value === "" ? null : e.target.value)
                }
              >
                <option value="">Select goal…</option>
                {sortedGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title.length > 52 ? `${g.title.slice(0, 50)}…` : g.title}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Executes toward that goal - horizons come from the Goals board.
              </p>
            </>
          )}
        </div>
      ) : null}

      {relatedKind === "deal" ? (
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-medium">Deal</span>
          <select
            className={cn(selectClass)}
            value={relatedId ?? ""}
            onChange={(e) =>
              onRelatedIdChange(e.target.value === "" ? null : e.target.value)
            }
          >
            <option value="">Select deal…</option>
            {sortedDeals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.company} · {d.title.length > 48 ? `${d.title.slice(0, 48)}…` : d.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {relatedKind === "company" ? (
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-medium">Company</span>
          <select
            className={cn(selectClass)}
            value={relatedId ?? ""}
            onChange={(e) =>
              onRelatedIdChange(e.target.value === "" ? null : e.target.value)
            }
          >
            <option value="">Select company…</option>
            {sortedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {relatedKind === "lead" ? (
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-medium">Lead</span>
          <select
            className={cn(selectClass)}
            value={relatedId ?? ""}
            onChange={(e) =>
              onRelatedIdChange(e.target.value === "" ? null : e.target.value)
            }
          >
            <option value="">Select lead…</option>
            {sortedLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.company} · {l.contactName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {relatedKind === "contact" ? (
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-medium">Contact</span>
          <select
            className={cn(selectClass)}
            value={relatedId ?? ""}
            onChange={(e) =>
              onRelatedIdChange(e.target.value === "" ? null : e.target.value)
            }
          >
            <option value="">Select contact…</option>
            {sortedContacts.map((c) => {
              const co = companies.find((x) => x.id === c.companyId);
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {co ? ` · ${co.name}` : ""}
                </option>
              );
            })}
          </select>
        </div>
      ) : null}
    </div>
  );
}
