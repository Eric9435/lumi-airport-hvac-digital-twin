import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/nexus/lumi-platform-navigation.tsx"),
  "utf8",
);

describe("LUMI enterprise navigation", () => {
  it("provides primary Nexus, Operations and HVAC destinations", () => {
    expect(source).toContain('href: "/nexus"');

    expect(source).toContain('href: "/nexus/operations"');

    expect(source).toContain('href: "/dashboard"');
  });

  it("provides all connected domain twins", () => {
    const routes = [
      "/nexus/power",
      "/nexus/energy",
      "/nexus/maintenance",
      "/nexus/safety",
      "/nexus/passenger-flow",
      "/nexus/flight-operations",
    ];

    for (const route of routes) {
      expect(source).toContain(`href: "${route}"`);
    }
  });

  it("provides accessible desktop and mobile menus", () => {
    expect(source).toContain("aria-expanded={domainMenuOpen}");

    expect(source).toContain('aria-controls="lumi-domain-twin-menu"');

    expect(source).toContain('id="lumi-domain-twin-menu"');

    expect(source).toContain("aria-expanded={mobileMenuOpen}");

    expect(source).toContain('aria-controls="lumi-mobile-navigation"');

    expect(source).toContain('id="lumi-mobile-navigation"');
  });

  it("passes a typed callback to primary navigation links", () => {
    expect(source).toContain("onNavigate: () => void");

    expect(source).toContain("onClick={onNavigate}");

    expect(source).toContain("onNavigate={closeNavigationMenus}");
  });

  it("closes desktop and mobile menus after navigation", () => {
    expect(source).toContain("function closeNavigationMenus(): void");

    expect(source).toContain("setDomainMenuOpen(false)");

    expect(source).toContain("setMobileMenuOpen(false)");

    const directHandlerCount = (
      source.match(/onClick=\{closeNavigationMenus\}/g) ?? []
    ).length;

    expect(directHandlerCount).toBeGreaterThanOrEqual(3);
  });

  it("does not reset menu state synchronously from pathname changes", () => {
    expect(source).not.toContain(
      `useEffect(() => {
    setDomainMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);`,
    );
  });

  it("supports outside-click and escape-key dismissal", () => {
    expect(source).toContain('document.addEventListener("mousedown"');

    expect(source).toContain('event.key === "Escape"');
  });

  it("marks active destinations accessibly", () => {
    expect(source).toContain('aria-current={active ? "page" : undefined}');
  });
});
