"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { Button, buttonVariants } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/Ui/Sheet";
import type { DealPricingModel, DealStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

import { useDeals } from "./DealsContext";

const DEAL_STAGE_OPTIONS: { value: DealStage; label: string; hint: string }[] =
  [
    { value: "lead", label: "Lead", hint: "New" },
    { value: "contacted", label: "Contacted", hint: "Reply" },
    { value: "discovery_call", label: "Discovery call", hint: "Fit" },
    { value: "proposal_sent", label: "Proposal sent", hint: "Paper" },
    { value: "negotiation", label: "Negotiation", hint: "Terms" },
    { value: "won", label: "Won", hint: "Booked" },
    { value: "lost", label: "Lost", hint: "Recycle" },
  ];

const PRICING_OPTIONS: { value: DealPricingModel | ""; label: string }[] = [
  { value: "", label: "Pricing model…" },
  { value: "fixed", label: "Fixed fee" },
  { value: "hourly", label: "Hourly" },
  { value: "retainer", label: "Retainer" },
];

export function AddDealSheet() {
  const { addDeal } = useDeals();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState<DealStage>("lead");
  const [valueEur, setValueEur] = useState("");
  const [probability, setProbability] = useState("35");
  const [closeDate, setCloseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [owner, setOwner] = useState("");
  const [serviceLine, setServiceLine] = useState("");
  const [dealScope, setDealScope] = useState("");
  const [pricingModel, setPricingModel] = useState<DealPricingModel | "">("");
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setCompany("");
    setStage("lead");
    setValueEur("");
    setProbability("35");
    setCloseDate(new Date().toISOString().slice(0, 10));
    setOwner("");
    setServiceLine("");
    setDealScope("");
    setPricingModel("");
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) reset();
    },
    [reset],
  );

  const handleSubmit = useCallback(() => {
    const t = title.trim();
    const co = company.trim();
    if (!t) {
      setError("Deal title is required.");
      return;
    }
    if (!co) {
      setError("Company is required.");
      return;
    }
    const parsedVal = Number(
      valueEur.replace(/\u00a0/g, "").replace(/\s/g, "").replace(",", "."),
    );
    const euros = Number.isFinite(parsedVal) ? parsedVal : 0;
    const probParsed = Number(probability.replace(",", "."));
    const prob = Number.isFinite(probParsed) ? probParsed : 35;

    addDeal({
      title: t,
      company: co,
      stage,
      valueEur: euros,
      probability: prob,
      closeDate,
      owner,
      serviceLine: serviceLine.trim() || null,
      dealScope: dealScope.trim() || null,
      pricingModel: pricingModel || null,
    });
    handleOpenChange(false);
  }, [
    addDeal,
    closeDate,
    company,
    dealScope,
    handleOpenChange,
    owner,
    pricingModel,
    probability,
    serviceLine,
    stage,
    title,
    valueEur,
  ]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        type="button"
        className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
      >
        <Plus className="size-4" aria-hidden />
        Add pipeline
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-sidebar-border shrink-0 border-b px-6 py-4">
          <SheetTitle>New pipeline deal</SheetTitle>
          <SheetDescription>
            Add an opportunity to the board. Pick the stage and expected close.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <label
              htmlFor="deal-title"
              className="text-foreground text-xs font-semibold"
            >
              Deal title<span className="text-primary"> *</span>
            </label>
            <Input
              id="deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renewal, Riga Tech Campus"
              className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="deal-company"
              className="text-foreground text-xs font-semibold"
            >
              Company<span className="text-primary"> *</span>
            </label>
            <Input
              id="deal-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Account name"
              className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
              autoComplete="organization"
            />
          </div>

          <div className="space-y-2">
            <span className="text-muted-foreground text-xs font-medium">
              Stage
            </span>
            <div className="flex flex-wrap gap-2">
              {DEAL_STAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStage(opt.value)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    stage === opt.value && "border-primary text-primary",
                  )}
                >
                  {opt.label}
                  <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="deal-service"
                className="text-muted-foreground text-xs font-medium"
              >
                Service line
              </label>
              <Input
                id="deal-service"
                value={serviceLine}
                onChange={(e) => setServiceLine(e.target.value)}
                placeholder="e.g. SEO audit, Next.js build"
                className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="deal-pricing"
                className="text-muted-foreground text-xs font-medium"
              >
                Pricing model
              </label>
              <select
                id="deal-pricing"
                value={pricingModel}
                onChange={(e) =>
                  setPricingModel(e.target.value as DealPricingModel | "")
                }
                className="border-input bg-[color-mix(in_oklab,var(--card)_55%,transparent)] h-10 w-full rounded-none border border-white/[0.08] px-3 text-sm [color-scheme:dark]"
              >
                {PRICING_OPTIONS.map((p) => (
                  <option key={p.label} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="deal-scope"
              className="text-muted-foreground text-xs font-medium"
            >
              Scope snapshot
            </label>
            <Input
              id="deal-scope"
              value={dealScope}
              onChange={(e) => setDealScope(e.target.value)}
              placeholder="e.g. Landing + CMS, 6-week sprint"
              className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="deal-value"
                className="text-muted-foreground text-xs font-medium"
              >
                Value (EUR)
              </label>
              <Input
                id="deal-value"
                inputMode="decimal"
                value={valueEur}
                onChange={(e) => setValueEur(e.target.value)}
                placeholder="0"
                className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] tabular-nums"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="deal-probability"
                className="text-muted-foreground text-xs font-medium"
              >
                Win probability (%)
              </label>
              <Input
                id="deal-probability"
                inputMode="numeric"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                placeholder="0–100"
                className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] tabular-nums"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="deal-close"
              className="text-muted-foreground text-xs font-medium"
            >
              Expected close
            </label>
            <Input
              id="deal-close"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="deal-owner"
              className="text-muted-foreground text-xs font-medium"
            >
              Owner
            </label>
            <Input
              id="deal-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Defaults to You"
              className="h-10 rounded-none border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_55%,transparent)]"
              autoComplete="name"
            />
          </div>
        </div>

        {error ? (
          <p className="text-destructive shrink-0 px-6 text-sm">{error}</p>
        ) : null}

        <SheetFooter className="border-sidebar-border shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="solid" onClick={handleSubmit}>
            Add pipeline
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
