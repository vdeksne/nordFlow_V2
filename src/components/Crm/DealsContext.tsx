"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { deals as seedDeals } from "@/lib/crm/mock-data";
import type { Deal, DealPricingModel, DealStage } from "@/lib/crm/types";

import { useCompanies } from "./CompaniesContext";

const STORAGE_KEY = "crm-deals-v2";

export type NewDealInput = {
  title: string;
  company: string;
  stage: DealStage;
  valueEur: number;
  probability: number;
  closeDate: string;
  owner: string;
  serviceLine?: string | null;
  dealScope?: string | null;
  pricingModel?: DealPricingModel | null;
};

function loadStored(): Deal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Deal[];
  } catch {
    return null;
  }
}

function persist(list: Deal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

type DealsContextValue = {
  deals: Deal[];
  addDeal: (input: NewDealInput) => Deal;
};

const DealsContext = createContext<DealsContextValue | null>(null);

export function DealsProvider({ children }: { children: ReactNode }) {
  const { ensureCompanyByName } = useCompanies();
  const [deals, setDeals] = useState<Deal[]>(seedDeals);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored && stored.length > 0) {
        setDeals(stored);
      } else {
        setDeals(seedDeals);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(deals);
  }, [deals, hydrated]);

  const addDeal = useCallback(
    (input: NewDealInput) => {
      const title = input.title.trim();
      const companyLabel = input.company.trim();
      const companyId = ensureCompanyByName(companyLabel);
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const valueEur = Number.isFinite(input.valueEur)
        ? Math.max(0, input.valueEur)
        : 0;
      let probability = Math.round(input.probability);
      probability = Math.min(100, Math.max(0, probability));
      const closeDate =
        input.closeDate.trim() || new Date().toISOString().slice(0, 10);

      const deal: Deal = {
        id,
        companyId,
        company: companyLabel,
        title,
        stage: input.stage,
        valueEur,
        probability,
        closeDate,
        owner: input.owner.trim() || "You",
        serviceLine: input.serviceLine?.trim() || null,
        dealScope: input.dealScope?.trim() || null,
        pricingModel: input.pricingModel ?? null,
      };
      setDeals((prev) => [...prev, deal]);
      return deal;
    },
    [ensureCompanyByName],
  );

  const value = useMemo(
    () => ({
      deals,
      addDeal,
    }),
    [deals, addDeal],
  );

  return (
    <DealsContext.Provider value={value}>{children}</DealsContext.Provider>
  );
}

export function useDeals(): DealsContextValue {
  const ctx = useContext(DealsContext);
  if (!ctx) {
    throw new Error("useDeals must be used within DealsProvider");
  }
  return ctx;
}
