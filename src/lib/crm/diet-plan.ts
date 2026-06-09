export type DietFoodCategory =
  | "fats_seeds"
  | "fish"
  | "fruits"
  | "vegetables"
  | "other";

export type DietFoodId =
  | "avocado"
  | "walnuts"
  | "almonds"
  | "chia_seeds"
  | "flaxseeds"
  | "salmon"
  | "sardines"
  | "mackerel"
  | "blueberries"
  | "strawberries"
  | "papaya"
  | "pomegranate"
  | "oranges"
  | "spinach"
  | "kale"
  | "broccoli"
  | "carrots"
  | "sweet_potatoes"
  | "pumpkin"
  | "tomatoes"
  | "cucumber"
  | "watermelon"
  | "green_tea"
  | "aloe_vera"
  | "dark_chocolate";

export type DietFood = {
  id: DietFoodId;
  name: string;
  category: DietFoodCategory;
  /** Short cue for why it is in the base plan */
  tag: string;
};

export const DIET_FOOD_CATEGORIES: {
  id: DietFoodCategory;
  label: string;
  accent: string;
  chip: string;
}[] = [
  {
    id: "fats_seeds",
    label: "Fats & seeds",
    accent: "from-amber-500/20 via-transparent to-transparent",
    chip: "border-amber-400/30 bg-amber-500/10 text-amber-100/90",
  },
  {
    id: "fish",
    label: "Fish",
    accent: "from-sky-500/20 via-transparent to-transparent",
    chip: "border-sky-400/30 bg-sky-500/10 text-sky-100/90",
  },
  {
    id: "fruits",
    label: "Fruits",
    accent: "from-rose-500/15 via-transparent to-transparent",
    chip: "border-rose-400/30 bg-rose-500/10 text-rose-100/90",
  },
  {
    id: "vegetables",
    label: "Vegetables",
    accent: "from-lime-500/15 via-transparent to-transparent",
    chip: "border-lime-400/30 bg-lime-500/10 text-lime-100/90",
  },
  {
    id: "other",
    label: "Drinks & extras",
    accent: "from-violet-500/15 via-transparent to-transparent",
    chip: "border-violet-400/30 bg-violet-500/10 text-violet-100/90",
  },
];

export const DIET_BASE_FOODS: DietFood[] = [
  { id: "avocado", name: "Avocado", category: "fats_seeds", tag: "Healthy fats" },
  { id: "walnuts", name: "Walnuts", category: "fats_seeds", tag: "Omega-3" },
  { id: "almonds", name: "Almonds", category: "fats_seeds", tag: "Protein + Mg" },
  { id: "chia_seeds", name: "Chia seeds", category: "fats_seeds", tag: "Fiber" },
  { id: "flaxseeds", name: "Flaxseeds", category: "fats_seeds", tag: "Lignans" },
  { id: "salmon", name: "Salmon", category: "fish", tag: "Omega-3" },
  { id: "sardines", name: "Sardines", category: "fish", tag: "Calcium" },
  { id: "mackerel", name: "Mackerel", category: "fish", tag: "D + B12" },
  {
    id: "blueberries",
    name: "Blueberries",
    category: "fruits",
    tag: "Antioxidants",
  },
  {
    id: "strawberries",
    name: "Strawberries",
    category: "fruits",
    tag: "Vitamin C",
  },
  { id: "papaya", name: "Papaya", category: "fruits", tag: "Enzymes" },
  {
    id: "pomegranate",
    name: "Pomegranate",
    category: "fruits",
    tag: "Polyphenols",
  },
  { id: "oranges", name: "Oranges", category: "fruits", tag: "Citrus" },
  {
    id: "watermelon",
    name: "Watermelon",
    category: "fruits",
    tag: "Hydration",
  },
  { id: "spinach", name: "Spinach", category: "vegetables", tag: "Iron + folate" },
  { id: "kale", name: "Kale", category: "vegetables", tag: "Leafy greens" },
  {
    id: "broccoli",
    name: "Broccoli",
    category: "vegetables",
    tag: "Cruciferous",
  },
  { id: "carrots", name: "Carrots", category: "vegetables", tag: "Beta-carotene" },
  {
    id: "sweet_potatoes",
    name: "Sweet potatoes",
    category: "vegetables",
    tag: "Complex carbs",
  },
  { id: "pumpkin", name: "Pumpkin", category: "vegetables", tag: "Fiber" },
  { id: "tomatoes", name: "Tomatoes", category: "vegetables", tag: "Lycopene" },
  { id: "cucumber", name: "Cucumber", category: "vegetables", tag: "Light + crisp" },
  {
    id: "green_tea",
    name: "Green tea",
    category: "other",
    tag: "Polyphenols",
  },
  {
    id: "aloe_vera",
    name: "Aloe vera (edible)",
    category: "other",
    tag: "Soothing",
  },
  {
    id: "dark_chocolate",
    name: "Dark chocolate (70%+ cocoa)",
    category: "other",
    tag: "Flavanols",
  },
];

export const ALL_DIET_FOOD_IDS: DietFoodId[] = DIET_BASE_FOODS.map((f) => f.id);

export function dietCategoryMeta(id: DietFoodCategory) {
  return DIET_FOOD_CATEGORIES.find((c) => c.id === id)!;
}

export function dietFoodById(id: string): DietFood | undefined {
  return DIET_BASE_FOODS.find((f) => f.id === id);
}

export function localTodayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type DietPlanState = {
  /** Foods included in your rotation; empty in storage means "all base foods". */
  activeFoodIds: string[];
  logDate: string;
  loggedFoodIds: string[];
};

export function defaultDietPlanState(): DietPlanState {
  return {
    activeFoodIds: [...ALL_DIET_FOOD_IDS],
    logDate: localTodayKey(),
    loggedFoodIds: [],
  };
}

export function normalizeDietPlan(raw: unknown): DietPlanState {
  const base = defaultDietPlanState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<DietPlanState>;
  const valid = new Set(ALL_DIET_FOOD_IDS);
  const activeFoodIds = Array.isArray(o.activeFoodIds)
    ? o.activeFoodIds.filter((id): id is DietFoodId =>
        typeof id === "string" && valid.has(id as DietFoodId),
      )
    : base.activeFoodIds;
  const logDate =
    typeof o.logDate === "string" && o.logDate.trim()
      ? o.logDate.trim()
      : base.logDate;
  const loggedFoodIds = Array.isArray(o.loggedFoodIds)
    ? o.loggedFoodIds.filter((id): id is DietFoodId =>
        typeof id === "string" && valid.has(id as DietFoodId),
      )
    : [];
  const today = localTodayKey();
  if (logDate !== today) {
    return { activeFoodIds, logDate: today, loggedFoodIds: [] };
  }
  return { activeFoodIds, logDate, loggedFoodIds };
}
