"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Check, Minus } from "lucide-react";

import { NordflowLogo } from "@/components/Crm/NordflowLogo";
import { buttonVariants } from "@/components/Ui/Button";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

const YEARLY_DISCOUNT = 0.15;

function formatEuroRange(low: number, high: number) {
  return `€${low}-€${high}`;
}

export type PricingPageProps = {
  /** `app`: CRM shell (sidebar + TopBar). `marketing`: full standalone page. */
  variant?: "marketing" | "app";
};

export function PricingPage({ variant = "marketing" }: PricingPageProps) {
  const [billing, setBilling] = useState<Billing>("monthly");

  const proMonthlyLow = 8;
  const proMonthlyHigh = 12;
  const proYearlyLow = Math.round(proMonthlyLow * 12 * (1 - YEARLY_DISCOUNT));
  const proYearlyHigh = Math.round(proMonthlyHigh * 12 * (1 - YEARLY_DISCOUNT));
  const proEquivLow = Math.ceil(proYearlyLow / 12);
  const proEquivHigh = Math.ceil(proYearlyHigh / 12);

  const proPriceMain =
    billing === "monthly"
      ? formatEuroRange(proMonthlyLow, proMonthlyHigh)
      : formatEuroRange(proYearlyLow, proYearlyHigh);
  const proPriceSub =
    billing === "monthly"
      ? "Flat monthly fee - pick what fits your practice."
      : `About ${formatEuroRange(proEquivLow, proEquivHigh)} / month, billed annually.`;

  const body = (
    <>
      {variant === "marketing" ? (
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.28em] uppercase">
            Pricing
          </p>
          <h1 className="text-foreground mt-4 text-[clamp(1.85rem,4vw,2.75rem)] font-semibold tracking-tight text-balance">
            Plans built for independent grant consultants
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-pretty">
            Automate follow-ups, keep deadlines visible, and run a pipeline that
            stays honest - without enterprise bloat or spreadsheet chaos.
          </p>
        </div>
      ) : null}

      <div className={cn("flex justify-center", variant === "marketing" ? "mt-12" : "mt-2")}>
          <div
            className="inline-flex rounded-full border border-white/[0.1] bg-[color-mix(in_oklab,var(--secondary)_55%,transparent)] p-1 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]"
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-7 py-2.5 text-[13px] font-medium transition-colors",
                billing === "monthly"
                  ? "bg-white/[0.1] text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={cn(
                "rounded-full px-7 py-2.5 text-[13px] font-medium transition-colors",
                billing === "yearly"
                  ? "bg-white/[0.1] text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yearly
              <span className="text-primary ml-2 text-[11px] font-semibold tabular-nums">
                −15%
              </span>
            </button>
          </div>
        </div>

      <div className="mx-auto mt-14 grid max-w-[920px] gap-8 md:grid-cols-2 md:gap-10">
          <article className="border-border/80 flex flex-col border bg-[color-mix(in_oklab,var(--card)_55%,transparent)] p-6 md:p-8">
            <div>
              <h2 className="text-foreground text-lg font-semibold tracking-tight">
                Free
              </h2>
              <p className="text-foreground mt-3 text-4xl font-semibold tracking-tight tabular-nums">
                €0
              </p>
              <p className="text-muted-foreground mt-2 text-[13px] leading-snug">
                Freemium · ~50 contacts · essentials only
              </p>
            </div>

            <p className="text-foreground/90 mt-8 text-sm font-medium">
              For testing NordFlow with a small book of business
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              <PricingFeature included>Up to ~50 contacts</PricingFeature>
              <PricingFeature included>Core CRM essentials</PricingFeature>
              <PricingFeature included>Dashboard & customers list</PricingFeature>
              <PricingFeature included={false}>
                Automation & advanced tooling
              </PricingFeature>
            </ul>

            <div className="mt-10 md:mt-auto md:pt-10">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "text-muted-foreground hover:text-foreground h-11 w-full border-white/[0.12] bg-transparent text-[13px] font-normal normal-case tracking-normal no-underline",
                )}
              >
                Start free
              </Link>
            </div>
          </article>

          <article className="border-primary/35 ring-primary/20 relative flex flex-col border bg-[color-mix(in_oklab,var(--card)_70%,transparent)] p-6 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_18%,transparent)] md:p-8">
            <span className="bg-primary/15 text-primary border-primary/25 absolute top-5 right-5 border px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase">
              Popular
            </span>
            <div>
              <h2 className="text-foreground text-lg font-semibold tracking-tight">
                NordFlow Pro
              </h2>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <p className="text-foreground text-4xl font-semibold tracking-tight tabular-nums">
                  {billing === "monthly" ? `${proPriceMain}/mo` : `${proPriceMain}/yr`}
                </p>
                {billing === "yearly" ? (
                  <span className="text-primary bg-primary/12 rounded-md border border-primary/25 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                    −15%
                  </span>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-2 text-[13px] leading-snug">
                {proPriceSub}
              </p>
            </div>

            <p className="text-foreground/90 mt-8 text-sm font-medium">
              For consultants who want the full workflow
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              <PricingFeature included>Unlimited contacts</PricingFeature>
              <PricingFeature included>Tasks & reminders</PricingFeature>
              <PricingFeature included>Pipeline</PricingFeature>
              <PricingFeature included>Basic export</PricingFeature>
            </ul>

            <div className="mt-10 md:mt-auto md:pt-10">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: "solid", size: "lg" }),
                  "h-11 w-full normal-case tracking-normal no-underline",
                )}
              >
                Get NordFlow Pro
              </Link>
            </div>
          </article>
      </div>

      <p className="text-muted-foreground mx-auto mt-14 max-w-xl text-center text-[13px] leading-relaxed">
        Prices shown are indicative for this demo. Wire Stripe or your billing
        provider when you launch - VAT may apply by region.
      </p>
    </>
  );

  if (variant === "app") {
    return (
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-[0.35]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 90% at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent)",
          }}
        />
        <div className="relative">{body}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 50% -18%, color-mix(in oklab, var(--primary) 14%, transparent), transparent)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0.02)_0%,transparent_38%)]" />
      </div>

      <header className="relative border-b border-white/[0.06]">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-6 px-6 lg:px-10">
          <Link
            href="/login"
            className="focus-visible:ring-primary shrink-0 rounded-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            aria-label="NordFlow · Sign in"
          >
            <NordflowLogo priority className="max-h-7 w-auto opacity-95 sm:max-h-8" />
          </Link>
          <nav
            className="text-muted-foreground hidden items-center gap-8 text-[13px] font-medium md:flex"
            aria-label="Marketing"
          >
            <span className="text-foreground">Pricing</span>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hidden text-[13px] font-medium transition-colors sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: "solid", size: "sm" }),
                "normal-case tracking-normal no-underline",
              )}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1280px] px-6 pb-24 pt-14 lg:px-10 lg:pt-20">
        {body}
      </main>

      <footer className="relative border-t border-white/[0.06] py-8">
        <p className="text-muted-foreground text-center text-[11px] tracking-wide">
          © {new Date().getFullYear()} NordFlow
        </p>
      </footer>
    </div>
  );
}

function PricingFeature({
  children,
  included,
}: {
  children: ReactNode;
  included: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
          included
            ? "border-primary/35 bg-primary/10 text-primary"
            : "border-white/[0.12] bg-white/[0.03] text-muted-foreground",
        )}
      >
        {included ? (
          <Check className="size-3 stroke-[2.5]" aria-hidden />
        ) : (
          <Minus className="size-3 opacity-70" aria-hidden />
        )}
      </span>
      <span
        className={cn(
          "text-[13px] leading-snug",
          included ? "text-muted-foreground" : "text-muted-foreground/75",
        )}
      >
        {children}
      </span>
    </li>
  );
}
