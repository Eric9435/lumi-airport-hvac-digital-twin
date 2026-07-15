import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("HVAC dashboard navigation integration", () => {
  it("wraps the existing dashboard with the shared LUMI platform shell", () => {
    const layout = readProjectFile("src/app/dashboard/layout.tsx");

    expect(layout).toContain("<LumiPlatformShell>");
  });

  it("uses the existing dashboard as the canonical HVAC route", () => {
    const navigation = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(navigation).toContain('href: "/dashboard"');
  });

  it("redirects the compatibility HVAC route to the dashboard", () => {
    const hvacPage = readProjectFile("src/app/hvac/page.tsx");

    expect(hvacPage).toContain('redirect("/dashboard")');
  });

  it("preserves Nexus Power and Energy navigation", () => {
    const navigation = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(navigation).toContain('href: "/nexus"');

    expect(navigation).toContain('href: "/nexus/power"');

    expect(navigation).toContain('href: "/nexus/energy"');
  });
});
