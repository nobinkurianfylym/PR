"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  BrainCircuit,
  CalendarRange,
  Users,
  FolderLock,
  MessageSquareQuote,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiPanel } from "@/components/layout/ai-panel";
import { FilmSwitcher } from "@/components/layout/film-switcher";
import { api, OverviewProvider, useOverview } from "@/hooks/use-overview";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  // Campaign Brain leads — it is the screen that answers what to do next.
  { href: "/brain", label: "Campaign Brain", icon: BrainCircuit },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaign", label: "Campaign", icon: CalendarRange },
  { href: "/team", label: "Street Team", icon: Users },
  { href: "/assets", label: "Assets", icon: FolderLock },
  { href: "/reviews", label: "Review Wall", icon: MessageSquareQuote },
];

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, loading, unauthorized } = useOverview();

  useEffect(() => {
    if (unauthorized) router.replace("/signin");
    // A signed-in user with no film goes straight to the wizard.
    else if (!loading && data && data.film === null && pathname !== "/films/new") {
      router.replace("/films/new");
    }
  }, [unauthorized, loading, data, pathname, router]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border px-3 py-5 md:flex">
        <Link href="/dashboard" className="px-3 text-sm font-semibold tracking-[0.14em]">
          PR.FYLYM
        </Link>
        <div className="mt-5">
          <FilmSwitcher />
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith(href)
                  ? "bg-raised text-foreground"
                  : "text-muted hover:bg-raised/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
          {data?.isMasterAdmin && (
            <Link
              href="/admin"
              className={cn(
                "mt-4 flex items-center gap-3 rounded-lg border border-blue-500/25 px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-raised text-foreground"
                  : "text-blue-400 hover:bg-raised/60",
              )}
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              Master Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-border px-3 pt-4">
          <p className="truncate text-[13px] font-medium">{data?.user.name ?? "…"}</p>
          <button
            onClick={() => {
              void api.signOut().then(() => router.replace("/"));
            }}
            className="mt-0.5 text-xs text-faint hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-8 md:px-10">{children}</main>

      <AiPanel />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <OverviewProvider>
      <Frame>{children}</Frame>
    </OverviewProvider>
  );
}
