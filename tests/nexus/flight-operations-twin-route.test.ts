import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Flight Operations Twin route", () => {
  it("provides a dedicated Flight Operations dashboard", () => {
    const source = readProjectFile("src/app/nexus/flight-operations/page.tsx");

    expect(source).toContain("Flight Operations Twin");

    expect(source).toContain("Flight Operations Register");

    expect(source).toContain("Cross-Domain Coupling");
  });

  it("adds Flight Operations to platform navigation", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus/flight-operations"');

    expect(source).toContain('label: "Flight Operations"');
  });

  it("preserves the canonical HVAC dashboard route", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/dashboard"');
  });
});
