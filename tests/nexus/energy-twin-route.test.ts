import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Energy Twin route", () => {
  it("provides a dedicated Energy Twin dashboard", () => {
    const source = readProjectFile("src/app/nexus/energy/page.tsx");

    expect(source).toContain("Energy Twin");
    expect(source).toContain("Energy Contribution Model");
    expect(source).toContain("Energy Intelligence Agent");
  });

  it("adds Energy Twin to platform navigation", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus/energy"');
    expect(source).toContain('label: "Energy Twin"');
  });

  it("provides navigation to Nexus, Power and HVAC", () => {
    const source = readProjectFile("src/app/nexus/energy/page.tsx");

    expect(source).toContain('href="/nexus"');
    expect(source).toContain('href="/nexus/power"');
    expect(source).toContain('href="/hvac"');
  });
});
