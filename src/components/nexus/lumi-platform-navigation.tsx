"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PlatformNavigationItem {
  href: string;
  shortLabel: string;
  label: string;
  description: string;
  routeMode: "exact" | "section";
}

const navigationItems: PlatformNavigationItem[] = [
  {
    href: "/nexus",
    shortLabel: "Nexus",
    label: "Nexus Command Center",
    description: "Unified airport infrastructure intelligence platform",
    routeMode: "exact",
  },
  {
    href: "/nexus/power",
    shortLabel: "Power",
    label: "Power Twin",
    description: "Airport electrical distribution intelligence",
    routeMode: "section",
  },
  {
    href: "/nexus/energy",
    shortLabel: "Energy",
    label: "Energy Twin",
    description: "Cross-domain demand and efficiency intelligence",
    routeMode: "section",
  },
  {
    href: "/nexus/maintenance",
    shortLabel: "Maint.",
    label: "Maintenance Twin",
    description: "Cross-domain predictive maintenance intelligence",
    routeMode: "section",
  },
  {
    href: "/nexus/safety",
    shortLabel: "Safety",
    label: "Safety Twin",
    description: "Airport safety readiness and critical-event intelligence",
    routeMode: "section",
  },
  {
    href: "/nexus/passenger-flow",
    shortLabel: "Flow",
    label: "Passenger Flow",
    description: "Airport passenger demand and congestion intelligence",
    routeMode: "section",
  },
  {
    href: "/dashboard",
    shortLabel: "HVAC",
    label: "HVAC Twin",
    description: "Operational airport HVAC Digital Twin",
    routeMode: "section",
  },
];

function isActiveRoute(
  pathname: string,
  item: PlatformNavigationItem,
): boolean {
  if (item.routeMode === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function LumiPlatformNavigation() {
  const pathname = usePathname();

  return (
    <>
      <a
        href="#lumi-main-content"
        className="fixed top-2 left-4 z-[100] -translate-y-24 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-xl transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/90 bg-slate-950/95 shadow-xl shadow-black/20 backdrop-blur-xl">
        <nav
          aria-label="LUMI platform navigation"
          className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-8"
        >
          <Link
            href="/nexus"
            aria-label="Open LUMI Nexus Command Center"
            className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <p className="truncate text-sm font-bold tracking-[0.18em] text-white">
              LUMI NEXUS
            </p>

            <p className="hidden truncate text-xs text-slate-500 xl:block">
              Autonomous Airport Infrastructure Intelligence
            </p>
          </Link>

          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1 shadow-xl shadow-black/10">
              {navigationItems.map((item) => {
                const active = isActiveRoute(pathname, item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={item.description}
                    className={[
                      "rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm",
                      "outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                      active
                        ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-200 shadow-md shadow-black/10"
                        : "border border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white",
                    ].join(" ")}
                  >
                    <span className="lg:hidden">{item.shortLabel}</span>

                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
