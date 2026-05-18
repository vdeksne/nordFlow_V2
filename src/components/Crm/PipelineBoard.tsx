import { deals as defaultDeals } from "@/lib/crm/mock-data";
import type { Deal, DealStage } from "@/lib/crm/types";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES: {
  stage: DealStage;
  title: string;
  hint: string;
}[] = [
  { stage: "lead", title: "Lead", hint: "New" },
  { stage: "contacted", title: "Contacted", hint: "Reply" },
  { stage: "discovery_call", title: "Discovery", hint: "Call" },
  { stage: "proposal_sent", title: "Proposal", hint: "Sent" },
  { stage: "negotiation", title: "Negotiation", hint: "Terms" },
  { stage: "won", title: "Won", hint: "Booked" },
  { stage: "lost", title: "Lost", hint: "Recycle" },
];

function stageAccent(stage: DealStage): string {
  if (stage === "won") {
    return "from-emerald-400/[0.15] via-transparent to-transparent";
  }
  if (stage === "lost") {
    return "from-rose-400/[0.12] via-transparent to-transparent";
  }
  return "from-primary/[0.12] via-transparent to-transparent";
}

function ProbabilityOrbit({ value }: { value: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = c * (1 - pct / 100);

  return (
    <div
      className="text-primary relative size-[42px] shrink-0"
      role="img"
      aria-label={`Win probability ${pct}%`}
    >
      <svg className="-rotate-90 size-full" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          className="stroke-white/[0.06]"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-foreground">
        {pct}
      </span>
    </div>
  );
}

function DealCard({ deal, stage }: { deal: Deal; stage: DealStage }) {
  return (
    <article className="group relative rounded-none">
      <div
        className={cn(
          "relative z-[1] overflow-hidden rounded-none border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] p-4 backdrop-blur-md",
          "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] transition-[border-color,transform] duration-300 ease-out",
          "group-hover:border-white/[0.11]",
          "translate-y-0 group-hover:-translate-y-px",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.65]",
            stageAccent(stage),
          )}
        />
        <div className="relative flex gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-muted-foreground truncate text-[11px] font-medium tracking-wide uppercase">
              {deal.company}
            </p>
            <h3 className="text-foreground text-[13px] leading-snug font-semibold tracking-tight">
              {deal.title}
            </h3>
            <p className="text-foreground pt-1 text-lg font-semibold tabular-nums tracking-tight">
              {formatEur(deal.valueEur)}
            </p>
          </div>
          <ProbabilityOrbit value={deal.probability} />
        </div>
        <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px] text-muted-foreground">
          <span className="truncate pr-2">{deal.owner}</span>
          <time className="shrink-0 tabular-nums text-muted-foreground/90">
            {deal.closeDate}
          </time>
        </div>
      </div>
    </article>
  );
}

type PipelineBoardProps = {
  deals?: Deal[];
};

export function PipelineBoard({ deals = defaultDeals }: PipelineBoardProps) {
  const columns = PIPELINE_STAGES.map((col) => ({
    ...col,
    items: deals.filter((d) => d.stage === col.stage),
  }));

  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const openValue = openDeals.reduce((s, d) => s + d.valueEur, 0);
  const weighted = openDeals.reduce(
    (s, d) => s + d.valueEur * (d.probability / 100),
    0,
  );

  return (
    <div className="space-y-10">
      <div className="border-sidebar-border grid gap-6 border-b border-white/[0.05] pb-8 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
            Open pipeline
          </p>
          <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {formatEur(openValue)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
            Weighted forecast
          </p>
          <p className="text-primary mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {formatEur(Math.round(weighted))}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
            Active deals
          </p>
          <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {openDeals.length}
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              / {deals.length}
            </span>
          </p>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="pointer-events-none absolute top-[18px] right-8 left-8 z-0 h-px bg-white/[0.08] md:left-12 md:right-12"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto flex min-w-[520px] max-w-5xl items-start justify-between gap-2 px-1 sm:gap-4 md:min-w-0 md:w-full">
          {columns.map((col, i) => {
            const hot = col.items.length > 0;
            return (
              <div
                key={col.stage}
                className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
              >
                <div
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums transition-all duration-500 sm:size-10 sm:text-[11px]",
                    hot
                      ? "border-primary/45 bg-primary/[0.14] text-primary"
                      : "border-white/[0.08] bg-background/60 text-muted-foreground",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 px-0.5">
                  <p className="text-foreground text-[10px] font-semibold tracking-[0.14em] uppercase sm:text-[11px]">
                    {col.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 hidden text-[10px] tracking-wide sm:block">
                    {col.hint}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[420px] min-w-[920px] gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory md:min-w-0 md:overflow-visible md:snap-none">
        {columns.map((column) => {
          const columnTotal = column.items.reduce((s, d) => s + d.valueEur, 0);
          return (
            <section
              key={column.stage}
              className="flex w-[min(100%,272px)] shrink-0 snap-start flex-col md:w-[248px]"
            >
              <header className="mb-4 flex items-end justify-between gap-2">
                <div>
                  <h2 className="text-foreground text-sm font-semibold tracking-tight">
                    {column.title}
                  </h2>
                  <p className="text-muted-foreground mt-0.5 text-[11px] tracking-wide">
                    {column.items.length}{" "}
                    {column.items.length === 1 ? "deal" : "deals"}
                  </p>
                </div>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {column.items.length > 0 ? formatEur(columnTotal) : "-"}
                </span>
              </header>

              <div className="flex flex-1 flex-col gap-3">
                {column.items.length === 0 ? (
                  <div className="border-sidebar-border text-muted-foreground/70 flex min-h-[120px] flex-col items-center justify-center rounded-none border border-dashed border-white/[0.07] bg-white/[0.02] px-4 py-8 text-center text-xs leading-relaxed">
                    <span className="mb-2 inline-flex size-8 items-center justify-center rounded-none border border-white/[0.06] text-lg font-light text-muted-foreground">
                      +
                    </span>
                    Drop the next deal here
                  </div>
                ) : (
                  column.items.map((deal) => (
                    <div
                      key={deal.id}
                      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
                    >
                      <DealCard deal={deal} stage={column.stage} />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-muted-foreground/80 pt-2 text-center text-[10px] tracking-[0.12em] uppercase">
        Drag deals across stages
      </p>
    </div>
  );
}
