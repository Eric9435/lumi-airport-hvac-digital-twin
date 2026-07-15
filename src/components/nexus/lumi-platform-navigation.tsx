"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PlatformNavigationItem {
  href: string;
  shortLabel: string;
  label: string;
  description: string;
}

const navigationItems: PlatformNavigationItem[] = [
  {
    href: "/nexus",
    shortLabel: "Nexus",
    label: "Nexus Command Center",
    description: "Unified airport infrastructure intelligence platform",
  },
  {
    href: "/hvac",
    shortLabel: "HVAC",
    label: "LUMI HVAC Digital Twin",
    description: "Operational airport HVAC Digital Twin",
  },
];

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/90 bg-slate-950/95 shadow-lg shadow-black/20 backdrop-blur-xl">
        <nav
          aria-label="LUMI platform navigation"
          className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        >
          <Link
            href="/nexus"
            className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <p className="truncate text-sm font-bold tracking-[0.2em] text-white">
              LUMI NEXUS
            </p>
            <p className="hidden truncate text-xs text-slate-500 md:block">
              Autonomous Airport Infrastructure Intelligence Platform
            </p>
          </Link>

          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            {navigationItems.map((item) => {
              const active = isActiveRoute(pathname, item.href);

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
                      ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-950/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  ].join(" ")}
                >
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
    </>
  );
}
