import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/nexus/lumi-platform-navigation.tsx"),
  "utf8",
);

describe("LUMI enterprise navigation", () => {
  it("provides all primary platform destinations", () => {
    for (const route of [
      "/nexus",
      "/nexus/operations",
      "/nexus/replay",
      "/dashboard",
    ]) {
      expect(source).toContain(`href: "${route}"`);
    }
  });

  it("provides all connected domain twins", () => {
    for (const route of [
      "/nexus/power",
      "/nexus/energy",
      "/nexus/maintenance",
      "/nexus/safety",
      "/nexus/passenger-flow",
      "/nexus/flight-operations",
    ]) {
      expect(source).toContain(`href: "${route}"`);
    }
  });

  it("provides a typed Replay Console navigation item", () => {
    expect(source).toContain('href: "/nexus/replay"');

    expect(source).toContain('label: "Replay Console"');

    expect(source).toContain('shortLabel: "Replay"');
  });

  it("provides accessible desktop and mobile menus", () => {
    expect(source).toContain('aria-controls="lumi-domain-twin-menu"');

    expect(source).toContain("aria-expanded={domainMenuOpen}");

    expect(source).toContain('aria-controls="lumi-mobile-navigation"');

    expect(source).toContain("aria-expanded={mobileMenuOpen}");
  });

  it("uses a typed callback for primary links", () => {
    expect(source).toContain("onNavigate: () => void");

    expect(source).toContain("onClick={onNavigate}");

    expect(source).toContain("onNavigate={closeNavigationMenus}");
  });

  it("closes menus through navigation actions", () => {
    expect(source).toContain("function closeNavigationMenus(): void");

    expect(source).toContain("setDomainMenuOpen(false)");

    expect(source).toContain("setMobileMenuOpen(false)");
  });

  it("does not synchronously reset state on pathname changes", () => {
    expect(source).not.toContain(
      `useEffect(() => {
    setDomainMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);`,
    );
  });

  it("supports pointer and keyboard dismissal", () => {
    expect(source).toContain('document.addEventListener("mousedown"');

    expect(source).toContain('event.key === "Escape"');
  });

  it("marks active routes accessibly", () => {
    expect(source).toContain('aria-current={active ? "page" : undefined}');
  });
});
