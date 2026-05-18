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

import { projects as seedProjects } from "@/lib/crm/mock-data";
import type { Project, ProjectStatus } from "@/lib/crm/types";

import { useCompanies } from "./CompaniesContext";

const STORAGE_KEY = "crm-projects-v1";

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `prj-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type NewProjectInput = {
  title: string;
  company: string;
  scheduledStart: string;
  scheduledHour?: number | null;
  status: ProjectStatus;
  owner: string;
  dealId?: string | null;
};

/** Fields editable from the project detail sheet */
export type ProjectUpdateInput = Partial<{
  title: string;
  company: string;
  scheduledStart: string;
  scheduledHour: number | null;
  status: ProjectStatus;
  owner: string;
  dealId: string | null;
}>;

function loadStored(): Project[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Project[];
  } catch {
    return null;
  }
}

function persist(list: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

type ProjectsContextValue = {
  projects: Project[];
  addProject: (input: NewProjectInput) => void;
  updateProject: (id: string, patch: ProjectUpdateInput) => void;
  deleteProject: (id: string) => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { ensureCompanyByName, companyById } = useCompanies();
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadStored();
      if (stored && stored.length > 0) {
        setProjects(stored);
      } else {
        setProjects(seedProjects);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(projects);
  }, [projects, hydrated]);

  const addProject = useCallback(
    (input: NewProjectInput) => {
      const trimmedCompany = input.company.trim();
      const companyId = ensureCompanyByName(trimmedCompany);
      const companyLabel =
        companyById(companyId)?.name ?? trimmedCompany;

      const hour =
        input.scheduledHour !== undefined &&
        input.scheduledHour !== null &&
        Number.isFinite(input.scheduledHour)
          ? Math.min(23, Math.max(0, Math.floor(input.scheduledHour)))
          : null;

      const row: Project = {
        id: genId(),
        title: input.title.trim(),
        companyId,
        company: companyLabel,
        dealId: input.dealId?.trim() || null,
        scheduledStart: input.scheduledStart,
        scheduledHour: hour,
        status: input.status,
        owner: input.owner.trim() || "You",
      };

      setProjects((prev) => [row, ...prev]);
    },
    [companyById, ensureCompanyByName],
  );

  const updateProject = useCallback(
    (id: string, patch: ProjectUpdateInput) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next: Project = { ...p };
          if (patch.title !== undefined) {
            next.title = patch.title.trim();
          }
          if (patch.scheduledStart !== undefined) {
            next.scheduledStart = patch.scheduledStart;
          }
          if (patch.status !== undefined) {
            next.status = patch.status;
          }
          if (patch.owner !== undefined) {
            next.owner = patch.owner.trim() || "You";
          }
          if (patch.dealId !== undefined) {
            next.dealId =
              patch.dealId === null || patch.dealId.trim() === ""
                ? null
                : patch.dealId.trim();
          }
          if (patch.company !== undefined) {
            const trimmedCompany = patch.company.trim();
            const companyId = ensureCompanyByName(trimmedCompany);
            next.companyId = companyId;
            next.company =
              companyById(companyId)?.name ?? trimmedCompany;
          }
          if (patch.scheduledHour !== undefined) {
            next.scheduledHour =
              patch.scheduledHour !== null &&
              Number.isFinite(patch.scheduledHour)
                ? Math.min(23, Math.max(0, Math.floor(patch.scheduledHour)))
                : null;
          }
          return next;
        }),
      );
    },
    [companyById, ensureCompanyByName],
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      projects,
      addProject,
      updateProject,
      deleteProject,
    }),
    [addProject, deleteProject, projects, updateProject],
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjects must be used within ProjectsProvider");
  }
  return ctx;
}
