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

export type AdminProfile = {
  displayName: string;
  email: string;
  initials: string;
  jobTitle: string;
  phone: string;
};

const STORAGE_KEY = "crm-admin-profile-v1";

const DEFAULT_PROFILE: AdminProfile = {
  displayName: "Workspace admin",
  email: "admin@nordflow.demo",
  initials: "VK",
  jobTitle: "Administrator",
  phone: "",
};

/** Normalizes user-entered initials for avatars (max two letters). */
export function normalizeAdminInitials(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (t.length >= 2) return t.slice(0, 2);
  if (t.length === 1) return t;
  return "NF";
}

function initialsFromAuthSession(name: string, email: string): string {
  const n = name.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return normalizeAdminInitials(
        `${parts[0].charAt(0)}${parts[parts.length - 1]?.charAt(0) ?? ""}`,
      );
    }
    return normalizeAdminInitials(parts[0]?.slice(0, 2) ?? "");
  }
  const local = email.split("@")[0] ?? "";
  return normalizeAdminInitials(local.slice(0, 2));
}

function loadStored(): AdminProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    return {
      displayName:
        typeof o.displayName === "string" ? o.displayName : DEFAULT_PROFILE.displayName,
      email: typeof o.email === "string" ? o.email : DEFAULT_PROFILE.email,
      initials: normalizeAdminInitials(
        typeof o.initials === "string" ? o.initials : DEFAULT_PROFILE.initials,
      ),
      jobTitle:
        typeof o.jobTitle === "string" ? o.jobTitle : DEFAULT_PROFILE.jobTitle,
      phone: typeof o.phone === "string" ? o.phone : DEFAULT_PROFILE.phone,
    };
  } catch {
    return null;
  }
}

function persist(profile: AdminProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

type ProfileContextValue = {
  profile: AdminProfile;
  hydrated: boolean;
  updateProfile: (next: Partial<AdminProfile>) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored) setProfile(stored);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: { email: string; name: string } } | null) => {
        if (cancelled || !data?.user) return;
        setProfile((prev) => ({
          ...prev,
          displayName:
            data.user!.name?.trim() || prev.displayName,
          email: data.user!.email || prev.email,
          initials: initialsFromAuthSession(
            data.user!.name ?? "",
            data.user!.email,
          ),
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    persist(profile);
  }, [profile, hydrated]);

  const updateProfile = useCallback((next: Partial<AdminProfile>) => {
    setProfile((prev) => {
      const merged = { ...prev, ...next };
      if (next.initials !== undefined) {
        merged.initials = normalizeAdminInitials(next.initials);
      }
      return merged;
    });
  }, []);

  const value = useMemo(
    () => ({ profile, hydrated, updateProfile }),
    [profile, hydrated, updateProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}
