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

import { contacts as seedContacts } from "@/lib/crm/mock-data";
import type { Contact } from "@/lib/crm/types";

const STORAGE_KEY = "crm-contacts-v1";

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `cnt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadStored(): Contact[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Contact[];
  } catch {
    return null;
  }
}

function persist(list: Contact[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

type ContactsContextValue = {
  contacts: Contact[];
  contactById: (id: string) => Contact | undefined;
  addContact: (partial: Omit<Contact, "id"> & { id?: string }) => Contact;
};

const ContactsContext = createContext<ContactsContextValue | null>(null);

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored && stored.length > 0) {
        setContacts(stored);
      } else {
        setContacts(seedContacts);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(contacts);
  }, [contacts, hydrated]);

  const contactById = useCallback(
    (id: string) => contacts.find((c) => c.id === id),
    [contacts],
  );

  const addContact = useCallback((partial: Omit<Contact, "id"> & { id?: string }) => {
    let created!: Contact;
    setContacts((prev) => {
      const id = partial.id ?? genId();
      created = {
        id,
        companyId: partial.companyId,
        name: partial.name.trim(),
        email: partial.email ?? null,
        phone: partial.phone ?? null,
        role: partial.role ?? null,
      };
      return [...prev, created];
    });
    return created;
  }, []);

  const value = useMemo(
    () => ({
      contacts,
      contactById,
      addContact,
    }),
    [contacts, contactById, addContact],
  );

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts(): ContactsContextValue {
  const ctx = useContext(ContactsContext);
  if (!ctx) {
    throw new Error("useContacts must be used within ContactsProvider");
  }
  return ctx;
}
