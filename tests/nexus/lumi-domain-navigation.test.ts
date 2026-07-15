import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("LUMI domain navigation", () => {
  const navigation = readProjectFile(
    "src/components/nexus/lumi-platform-navigation.tsx",
  );

  it("provides direct navigation to all available platform views", () => {
    expect(navigation).toContain('href: "/nexus"');

    expect(navigation).toContain('href: "/nexus/power"');

    expect(navigation).toContain('href: "/dashboard"');
  });

  it("uses exact matching for the Nexus overview", () => {
    expect(navigation).toContain('routeMode: "exact"');

    expect(navigation).toContain("return pathname === item.href");
  });

  it("uses section matching for domain twins", () => {
    expect(navigation).toContain('routeMode: "section"');

    expect(navigation).toContain("pathname.startsWith(`${item.href}/`)");
  });

  it("marks only the matching destination as the current page", () => {
    expect(navigation).toContain('aria-current={active ? "page" : undefined}');
  });

  it("keeps navigation usable on narrow displays", () => {
    expect(navigation).toContain("overflow-x-auto");

    expect(navigation).toContain("min-w-max");
  });
});
