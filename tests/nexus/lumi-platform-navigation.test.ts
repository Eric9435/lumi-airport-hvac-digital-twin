import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("LUMI platform navigation", () => {
  const navigation = readProjectFile(
    "src/components/nexus/lumi-platform-navigation.tsx",
  );

  it("provides primary platform navigation", () => {
    expect(navigation).toContain('href: "/nexus"');

    expect(navigation).toContain('href: "/nexus/operations"');

    expect(navigation).toContain('href: "/dashboard"');
  });

  it("marks active routes accessibly", () => {
    expect(navigation).toContain('aria-current={active ? "page" : undefined}');
  });

  it("wraps the Nexus route with the shared shell", () => {
    const layout = readProjectFile("src/app/nexus/layout.tsx");

    expect(layout).toContain("<LumiPlatformShell>");
  });

  it("wraps the HVAC dashboard with the shared shell", () => {
    const layout = readProjectFile("src/app/dashboard/layout.tsx");

    expect(layout).toContain("<LumiPlatformShell>");
  });

  it("preserves Nexus as the primary application entry", () => {
    const rootPage = readProjectFile("src/app/page.tsx");

    expect(rootPage).toContain('redirect("/nexus")');
  });

  it("provides desktop and mobile navigation modes", () => {
    expect(navigation).toContain("md:flex");

    expect(navigation).toContain("md:hidden");

    expect(navigation).toContain("mobileMenuOpen");
  });
});
