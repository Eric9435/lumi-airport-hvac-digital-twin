"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface NavigationItem {
  href: string;
  shortLabel: string;
  label: string;
  description: string;
}

const primaryNavigationItems: NavigationItem[] = [
  {
    href: "/nexus",
    shortLabel: "Nexus",
    label: "Nexus Command Center",
    description: "Unified airport infrastructure intelligence",
  },
  {
    href: "/nexus/operations",
    shortLabel: "Ops",
    label: "Operations Console",
    description: "Events, agents, approvals and platform operations",
  },
  {
    href: "/dashboard",
    shortLabel: "HVAC",
    label: "HVAC Digital Twin",
    description: "Operational airport HVAC Digital Twin",
  },
];

const domainTwinItems: NavigationItem[] = [
  {
    href: "/nexus/power",
    shortLabel: "Power",
    label: "Power Twin",
    description: "Electrical distribution and power intelligence",
  },
  {
    href: "/nexus/energy",
    shortLabel: "Energy",
    label: "Energy Twin",
    description: "Demand, consumption and efficiency intelligence",
  },
  {
    href: "/nexus/maintenance",
    shortLabel: "Maintenance",
    label: "Maintenance Twin",
    description: "Asset health and predictive maintenance",
  },
  {
    href: "/nexus/safety",
    shortLabel: "Safety",
    label: "Safety Twin",
    description: "Critical assets and safety readiness",
  },
  {
    href: "/nexus/passenger-flow",
    shortLabel: "Passenger",
    label: "Passenger Flow Twin",
    description: "Terminal demand and congestion intelligence",
  },
  {
    href: "/nexus/flight-operations",
    shortLabel: "Flights",
    label: "Flight Operations Twin",
    description: "Flights, gates and delay-pressure intelligence",
  },
];

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/nexus") {
    return pathname === "/nexus";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isDomainTwinRoute(pathname: string): boolean {
  return domainTwinItems.some((item) => isRouteActive(pathname, item.href));
}

interface PrimaryLinkProps {
  item: NavigationItem;
  pathname: string;
  onNavigate: () => void;
}

function PrimaryLink({ item, pathname, onNavigate }: PrimaryLinkProps) {
  const active = isRouteActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      title={item.description}
      className={[
        "rounded-lg border px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm",
        "outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
        active
          ? "border-cyan-500/40 bg-cyan-500/20 text-cyan-200 shadow-md shadow-black/10"
          : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white",
      ].join(" ")}
    >
      <span className="sm:hidden">{item.shortLabel}</span>

      <span className="hidden sm:inline">{item.label}</span>
    </Link>
  );
}

export function LumiPlatformNavigation() {
  const pathname = usePathname();

  const [domainMenuOpen, setDomainMenuOpen] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const domainMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        domainMenuRef.current &&
        !domainMenuRef.current.contains(event.target as Node)
      ) {
        setDomainMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDomainMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const domainActive = isDomainTwinRoute(pathname);

  function closeNavigationMenus(): void {
    setDomainMenuOpen(false);
    setMobileMenuOpen(false);
  }

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

          <div className="hidden items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1 shadow-xl shadow-black/10 md:flex">
            {primaryNavigationItems.map((item) => (
              <PrimaryLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={closeNavigationMenus}
              />
            ))}

            <div ref={domainMenuRef} className="relative">
              <button
                type="button"
                aria-expanded={domainMenuOpen}
                aria-controls="lumi-domain-twin-menu"
                onClick={() => setDomainMenuOpen((current) => !current)}
                className={[
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                  domainActive
                    ? "border-cyan-500/40 bg-cyan-500/20 text-cyan-200"
                    : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white",
                ].join(" ")}
              >
                Domain Twins
                <span
                  aria-hidden="true"
                  className={[
                    "text-xs transition-transform",
                    domainMenuOpen ? "rotate-180" : "",
                  ].join(" ")}
                >
                  ▼
                </span>
              </button>

              {domainMenuOpen && (
                <div
                  id="lumi-domain-twin-menu"
                  className="absolute top-[calc(100%+0.75rem)] right-0 w-80 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/50"
                >
                  <div className="border-b border-slate-800 px-3 py-3">
                    <p className="text-xs font-semibold tracking-[0.2em] text-cyan-400 uppercase">
                      Connected Digital Twins
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Select an airport infrastructure or operations domain.
                    </p>
                  </div>

                  <div className="mt-2 space-y-1">
                    {domainTwinItems.map((item) => {
                      const active = isRouteActive(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={closeNavigationMenus}
                          className={[
                            "block rounded-xl border px-3 py-3 transition-all",
                            "outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                            active
                              ? "border-cyan-500/30 bg-cyan-500/10"
                              : "border-transparent hover:border-slate-700 hover:bg-slate-800",
                          ].join(" ")}
                        >
                          <p
                            className={[
                              "text-sm font-semibold",
                              active ? "text-cyan-200" : "text-slate-200",
                            ].join(" ")}
                          >
                            {item.label}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {item.description}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label="Toggle LUMI navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="lumi-mobile-navigation"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-400 md:hidden"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div
            id="lumi-mobile-navigation"
            className="border-t border-slate-800 bg-slate-950 px-3 py-4 shadow-2xl md:hidden"
          >
            <div className="mx-auto max-w-[1600px] space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {primaryNavigationItems.map((item) => {
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={closeNavigationMenus}
                      className={[
                        "rounded-xl border px-3 py-3 text-center text-sm font-semibold",
                        active
                          ? "border-cyan-500/40 bg-cyan-500/20 text-cyan-200"
                          : "border-slate-800 bg-slate-900 text-slate-300",
                      ].join(" ")}
                    >
                      {item.shortLabel}
                    </Link>
                  );
                })}
              </div>

              <div>
                <p className="px-1 text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
                  Domain Twins
                </p>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {domainTwinItems.map((item) => {
                    const active = isRouteActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={closeNavigationMenus}
                        className={[
                          "rounded-xl border px-3 py-3",
                          active
                            ? "border-cyan-500/40 bg-cyan-500/10"
                            : "border-slate-800 bg-slate-900",
                        ].join(" ")}
                      >
                        <p
                          className={[
                            "text-sm font-semibold",
                            active ? "text-cyan-200" : "text-slate-200",
                          ].join(" ")}
                        >
                          {item.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
