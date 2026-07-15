import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const navigation = readFileSync(
  resolve(process.cwd(), "src/components/nexus/lumi-platform-navigation.tsx"),
  "utf8",
);

describe("LUMI domain navigation", () => {
  it("provides all available platform destinations", () => {
    const routes = [
      "/nexus",
      "/nexus/operations",
      "/dashboard",
      "/nexus/power",
      "/nexus/energy",
      "/nexus/maintenance",
      "/nexus/safety",
      "/nexus/passenger-flow",
      "/nexus/flight-operations",
    ];

    for (const route of routes) {
      expect(navigation).toContain(`href: "${route}"`);
    }
  });

  it("uses exact matching for the Nexus overview", () => {
    expect(navigation).toContain('if (href === "/nexus")');

    expect(navigation).toContain('return pathname === "/nexus"');
  });

  it("uses section matching for nested destinations", () => {
    expect(navigation).toContain("pathname.startsWith(`${href}/`)");
  });

  it("groups connected twins in an enterprise domain menu", () => {
    expect(navigation).toContain("const domainTwinItems");

    expect(navigation).toContain("Domain Twins");

    expect(navigation).toContain('id="lumi-domain-twin-menu"');
  });

  it("provides a dedicated responsive mobile menu", () => {
    expect(navigation).toContain('aria-label="Toggle LUMI navigation menu"');

    expect(navigation).toContain('id="lumi-mobile-navigation"');

    expect(navigation).toContain("md:hidden");
  });

  it("marks active destinations accessibly", () => {
    expect(navigation).toContain('aria-current={active ? "page" : undefined}');
  });
});
