import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("LUMI platform navigation", () => {
  it("provides Nexus and HVAC navigation links", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus"');
    expect(source).toContain('href: "/hvac"');
  });

  it("marks the active route accessibly", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('aria-current={active ? "page" : undefined}');
  });

  it("wraps the Nexus route with the shared shell", () => {
    const source = readProjectFile("src/app/nexus/layout.tsx");

    expect(source).toContain("<LumiPlatformShell>");
  });

  it("wraps the HVAC route with the shared shell", () => {
    const source = readProjectFile("src/app/hvac/layout.tsx");

    expect(source).toContain("<LumiPlatformShell>");
  });

  it("preserves Nexus as the primary application entry", () => {
    const source = readProjectFile("src/app/page.tsx");

    expect(source).toContain('redirect("/nexus")');
  });
});
