import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Safety Twin route", () => {
  it("provides a dedicated Safety Twin dashboard", () => {
    const source = readProjectFile("src/app/nexus/safety/page.tsx");

    expect(source).toContain("Safety Twin");

    expect(source).toContain("Critical Infrastructure Register");

    expect(source).toContain("Safety Event Stream");
  });

  it("adds Safety Twin to platform navigation", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus/safety"');

    expect(source).toContain('label: "Safety Twin"');
  });

  it("preserves the canonical HVAC route", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/dashboard"');
  });
});
