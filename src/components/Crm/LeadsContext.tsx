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

import { leads as seedLeads } from "@/lib/crm/mock-data";
import type { Lead, LeadStage } from "@/lib/crm/types";

import { useCompanies } from "./CompaniesContext";
import { useContacts } from "./ContactsContext";

const STORAGE_KEY = "crm-leads-v2";

export type NewLeadInput = {
  company: string;
  contactName: string;
  email: string;
  stage: LeadStage;
  valueEur: number;
  owner: string;
};

function loadStored(): Lead[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Lead[];
  } catch {
    return null;
  }
}

function persist(list: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

type LeadsContextValue = {
  leads: Lead[];
  addLead: (input: NewLeadInput) => Lead;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { ensureCompanyByName } = useCompanies();
  const { addContact } = useContacts();
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored && stored.length > 0) {
        setLeads(stored);
      } else {
        setLeads(seedLeads);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(leads);
  }, [leads, hydrated]);

  const addLead = useCallback(
    (input: NewLeadInput) => {
      const companyLabel = input.company.trim();
      const companyId = ensureCompanyByName(companyLabel);
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `l-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const updatedAt = new Date().toISOString().slice(0, 10);
      const contactName = input.contactName.trim();
      const lead: Lead = {
        id,
        companyId,
        primaryContactId: `cnt-${id}`,
        company: companyLabel,
        contactName,
        email: input.email.trim(),
        stage: input.stage,
        valueEur: Number.isFinite(input.valueEur) ? Math.max(0, input.valueEur) : 0,
        owner: input.owner.trim() || "You",
        updatedAt,
      };
      addContact({
        id: `cnt-${id}`,
        companyId,
        name: contactName,
        email: lead.email,
        phone: null,
        role: null,
      });
      setLeads((prev) => [...prev, lead]);
      return lead;
    },
    [ensureCompanyByName, addContact],
  );

  const value = useMemo(
    () => ({
      leads,
      addLead,
    }),
    [leads, addLead],
  );

  return (
    <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
  );
}

export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext);
  if (!ctx) {
    throw new Error("useLeads must be used within LeadsProvider");
  }
  return ctx;
}
