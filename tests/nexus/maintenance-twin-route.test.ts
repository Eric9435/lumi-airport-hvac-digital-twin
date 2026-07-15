import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Maintenance Twin route", () => {
  it("provides a dedicated Maintenance Twin dashboard", () => {
    const source = readProjectFile("src/app/nexus/maintenance/page.tsx");

    expect(source).toContain("Maintenance Twin");

    expect(source).toContain("Maintenance Priority Register");

    expect(source).toContain("Maintenance Intelligence Agent");
  });

  it("adds Maintenance Twin to platform navigation", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus/maintenance"');

    expect(source).toContain('label: "Maintenance Twin"');
  });

  it("preserves the canonical HVAC dashboard route", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/dashboard"');
  });
});
