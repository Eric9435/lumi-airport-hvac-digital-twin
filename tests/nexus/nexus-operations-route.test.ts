import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Nexus Operations route", () => {
  it("provides a dedicated Operations Console", () => {
    const source = readProjectFile("src/app/nexus/operations/page.tsx");

    expect(source).toContain("Operations Console");

    expect(source).toContain("Nexus Event Stream");

    expect(source).toContain("Registered Agents");

    expect(source).toContain("Approval Queue");
  });

  it("adds Operations Console to primary navigation", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus/operations"');

    expect(source).toContain('label: "Operations Console"');
  });

  it("preserves the canonical HVAC route", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/dashboard"');
  });
});
