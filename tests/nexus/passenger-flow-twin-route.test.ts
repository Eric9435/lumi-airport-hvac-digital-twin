import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Passenger Flow Twin route", () => {
  it("provides a dedicated Passenger Flow dashboard", () => {
    const source = readProjectFile("src/app/nexus/passenger-flow/page.tsx");

    expect(source).toContain("Passenger Flow Twin");

    expect(source).toContain("Terminal and Zone Flow Register");

    expect(source).toContain("Operational Control Policy");
  });

  it("adds Passenger Flow Twin to domain navigation", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus/passenger-flow"');

    expect(source).toContain('label: "Passenger Flow Twin"');
  });

  it("preserves the canonical HVAC dashboard route", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/dashboard"');
  });
});
