"use client";

import { Check, Leaf, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  DIET_BASE_FOODS,
  DIET_FOOD_CATEGORIES,
  dietCategoryMeta,
  type DietFood,
  type DietFoodCategory,
  type DietFoodId,
} from "@/lib/crm/diet-plan";
import { cn } from "@/lib/utils";

import { useHealth } from "./HealthContext";

type FilterId = "all" | DietFoodCategory;

function DietFoodCard({
  food,
  inPlan,
  loggedToday,
  onTogglePlan,
  onToggleLogged,
}: {
  food: DietFood;
  inPlan: boolean;
  loggedToday: boolean;
  onTogglePlan: () => void;
  onToggleLogged: () => void;
}) {
  const cat = dietCategoryMeta(food.category);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-none border transition-[border-color,opacity,transform] duration-200",
        inPlan
          ? "border-white/10 bg-[color-mix(in_oklab,var(--card)_78%,transparent)]"
          : "border-white/5 bg-[color-mix(in_oklab,var(--card)_52%,transparent)] opacity-55",
        loggedToday && inPlan && "border-lime-400/35 ring-1 ring-lime-400/20",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          cat.accent,
        )}
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col p-3.5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span
            className={cn(
              "rounded-none border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase",
              cat.chip,
            )}
          >
            {cat.label}
          </span>
          <button
            type="button"
            onClick={onTogglePlan}
            className={cn(
              "shrink-0 rounded-none border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase transition-colors",
              inPlan
                ? "border-lime-400/35 bg-lime-500/15 text-lime-100/95"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
            )}
          >
            {inPlan ? "In plan" : "Add"}
          </button>
        </div>
        <h4 className="text-foreground text-sm font-semibold leading-snug tracking-tight">
          {food.name}
        </h4>
        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
          {food.tag}
        </p>
        <button
          type="button"
          disabled={!inPlan}
          onClick={onToggleLogged}
          className={cn(
            "mt-3 flex items-center justify-center gap-1.5 rounded-none border py-2 text-[10px] font-semibold tracking-[0.12em] uppercase transition-colors",
            !inPlan && "cursor-not-allowed opacity-40",
            loggedToday && inPlan
              ? "border-lime-400/40 bg-lime-500/20 text-lime-50"
              : "border-white/8 bg-black/20 text-muted-foreground hover:border-white/14 hover:text-foreground",
          )}
        >
          <Check
            className={cn("size-3.5", loggedToday && inPlan ? "opacity-100" : "opacity-40")}
            aria-hidden
          />
          {loggedToday ? "Had today" : "Log today"}
        </button>
      </div>
    </article>
  );
}

export function HealthDietPlanSection() {
  const { dietPlan, toggleDietFoodActive, toggleDietFoodLogged, resetDietPlanBase } =
    useHealth();
  const [filter, setFilter] = useState<FilterId>("all");

  const activeSet = useMemo(
    () => new Set(dietPlan.activeFoodIds),
    [dietPlan.activeFoodIds],
  );
  const loggedSet = useMemo(
    () => new Set(dietPlan.loggedFoodIds),
    [dietPlan.loggedFoodIds],
  );

  const visibleFoods = useMemo(() => {
    if (filter === "all") return DIET_BASE_FOODS;
    return DIET_BASE_FOODS.filter((f) => f.category === filter);
  }, [filter]);

  const activeCount = dietPlan.activeFoodIds.length;
  const loggedCount = dietPlan.loggedFoodIds.filter((id) =>
    activeSet.has(id),
  ).length;
  const progressPct =
    activeCount > 0 ? Math.round((loggedCount / activeCount) * 100) : 0;

  return (
    <section
      className="overflow-hidden rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_76%,transparent)] backdrop-blur-md"
      aria-labelledby="health-diet-plan-heading"
    >
      <header className="border-b border-white/6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-lime-200/90 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
              <Leaf className="size-3.5" aria-hidden />
              Diet plan
            </div>
            <h2
              id="health-diet-plan-heading"
              className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Base rotation · whole foods
            </h2>
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              {DIET_BASE_FOODS.length} foundation items. Toggle what stays in
              your plan, then log what you actually eat today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="border-white/8 min-w-[140px] rounded-none border bg-black/25 px-4 py-3">
              <p className="text-muted-foreground text-[9px] font-semibold tracking-[0.16em] uppercase">
                Today
              </p>
              <p className="text-foreground mt-0.5 text-lg font-semibold tabular-nums">
                {loggedCount}
                <span className="text-muted-foreground text-sm font-normal">
                  /{activeCount}
                </span>
              </p>
              <div className="bg-white/8 mt-2 h-1 overflow-hidden rounded-full">
                <div
                  className="bg-lime-400/80 h-full transition-[width] duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={resetDietPlanBase}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-none border border-white/8 px-3 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors hover:bg-white/[0.03]"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reset all
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
          />
          {DIET_FOOD_CATEGORIES.map((c) => (
            <FilterChip
              key={c.id}
              active={filter === c.id}
              onClick={() => setFilter(c.id)}
              label={c.label}
              className={c.chip}
            />
          ))}
        </div>
      </header>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="size-3.5 text-lime-400/80" aria-hidden />
          Tap <span className="text-foreground/90">Log today</span> when an item
          is on your plate.
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleFoods.map((food) => (
            <DietFoodCard
              key={food.id}
              food={food}
              inPlan={activeSet.has(food.id)}
              loggedToday={loggedSet.has(food.id)}
              onTogglePlan={() =>
                toggleDietFoodActive(food.id as DietFoodId)
              }
              onToggleLogged={() =>
                toggleDietFoodLogged(food.id as DietFoodId)
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-none border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors",
        active
          ? cn("border-primary/35 bg-primary/15 text-primary", className)
          : "border-white/8 bg-white/[0.02] text-muted-foreground hover:border-white/14 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
