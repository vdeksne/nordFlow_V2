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

import { companies as seedCompanies } from "@/lib/crm/mock-data";
import type { Company } from "@/lib/crm/types";

const STORAGE_KEY = "crm-companies-v2";

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `cmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadStored(): Company[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Company[];
  } catch {
    return null;
  }
}

function persist(list: Company[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function normalizeCompanies(rows: Company[]): Company[] {
  return rows.map((c) => ({
    ...c,
    tags: Array.isArray(c.tags) ? c.tags : [],
    source: c.source ?? null,
  }));
}

type CompaniesContextValue = {
  companies: Company[];
  companyById: (id: string) => Company | undefined;
  /** Resolve ID by existing row or create a lightweight company shell */
  ensureCompanyByName: (
    name: string,
    extras?: Partial<
      Pick<
        Company,
        "email" | "phone" | "websiteUrl" | "techStack" | "tags" | "source"
      >
    >,
  ) => string;
};

const CompaniesContext = createContext<CompaniesContextValue | null>(null);

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] =
    useState<Company[]>(() => normalizeCompanies(seedCompanies));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored && stored.length > 0) {
        setCompanies(normalizeCompanies(stored));
      } else {
        setCompanies(normalizeCompanies(seedCompanies));
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(companies);
  }, [companies, hydrated]);

  const companyById = useCallback(
    (id: string) => companies.find((c) => c.id === id),
    [companies],
  );

  const ensureCompanyByName = useCallback(
    (
      name: string,
      extras?: Partial<
        Pick<
          Company,
          "email" | "phone" | "websiteUrl" | "techStack" | "tags" | "source"
        >
      >,
    ) => {
      const trimmed = name.trim();
      let resolvedId = "";
      setCompanies((prev) => {
        const hit = prev.find(
          (c) => c.name.localeCompare(trimmed, undefined, { sensitivity: "accent" }) === 0,
        );
        if (hit) {
          resolvedId = hit.id;
          return prev;
        }
        const id = genId();
        resolvedId = id;
        const row: Company = {
          id,
          name: trimmed,
          email: extras?.email ?? null,
          phone: extras?.phone ?? null,
          websiteUrl: extras?.websiteUrl ?? null,
          techStack: extras?.techStack ?? null,
          tags: extras?.tags ?? [],
          source: extras?.source ?? null,
        };
        return [...prev, row];
      });
      return resolvedId;
    },
    [],
  );

  const value = useMemo(
    () => ({
      companies,
      companyById,
      ensureCompanyByName,
    }),
    [companies, companyById, ensureCompanyByName],
  );

  return (
    <CompaniesContext.Provider value={value}>
      {children}
    </CompaniesContext.Provider>
  );
}

export function useCompanies(): CompaniesContextValue {
  const ctx = useContext(CompaniesContext);
  if (!ctx) {
    throw new Error("useCompanies must be used within CompaniesProvider");
  }
  return ctx;
}
