"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  CalendarClock,
  CheckSquare,
  CreditCard,
  Crosshair,
  FolderKanban,
  HeartPulse,
  KanbanSquare,
  LayoutDashboard,
  Share2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

import { NordflowLogo } from "@/components/Crm/NordflowLogo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: CalendarClock },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/gnn", label: "GNN", icon: Share2 },
  { href: "/goals", label: "Goals", icon: Crosshair },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/pricing", label: "Subscription", icon: CreditCard },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[inset_-1px_0_0_rgb(255_255_255/0.04)] flex h-full w-full flex-col border-r">
      <div className="flex items-center gap-3 px-5 py-7">
        <Link
          href="/dashboard"
          className="focus-visible:ring-primary shrink-0 rounded-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar focus-visible:outline-none"
          aria-label="NordFlow · Dashboard"
        >
          <NordflowLogo priority />
        </Link>
        <div className="min-w-0 leading-tight">
          <p className="text-[13px] font-semibold tracking-tight">
            NordFlow CRM
          </p>
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
            Workspace
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
        <p className="text-muted-foreground px-3 pb-2 text-[10px] font-semibold tracking-[0.18em] uppercase">
          Modules
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" &&
              href !== "/today" &&
              href !== "/profile" &&
              pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 border-l-2 py-2.5 pr-3 pl-[calc(0.75rem-2px)] text-[12px] font-medium tracking-[0.02em] transition-colors duration-200",
                active
                  ? "border-primary text-foreground bg-white/[0.03]"
                  : "border-transparent text-muted-foreground hover:border-white/[0.12] hover:bg-white/[0.02] hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border mt-auto border-t border-white/[0.04] px-5 py-5">
        <div className="mb-3 opacity-90">
          <NordflowLogo className="max-h-11 max-w-[178px] xl:max-h-14 xl:max-w-[200px]" />
        </div>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Credentials auth uses Neon when DATABASE_URL + AUTH_SECRET are set.
          Otherwise this stays an open demo shell.
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="text-primary hover:text-primary/85 mt-3 inline-flex text-[11px] font-semibold tracking-wide transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
