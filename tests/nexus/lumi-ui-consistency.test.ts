import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const nexusPages = [
  "src/app/nexus/page.tsx",
  "src/app/nexus/power/page.tsx",
  "src/app/nexus/energy/page.tsx",
];

describe("LUMI UI consistency", () => {
  it.each(nexusPages)(
    "%s uses the same primary canvas as the HVAC dashboard",
    (file) => {
      const source = readProjectFile(file);

      expect(source).toContain("min-h-screen bg-slate-950");

      expect(source).toContain("max-w-[1600px]");

      expect(source).toContain("border-b border-slate-800 pb-6");
    },
  );

  it.each(nexusPages)("%s uses the standard LUMI card treatment", (file) => {
    const source = readProjectFile(file);

    expect(source).toContain(
      "rounded-2xl border border-slate-800 bg-slate-900/70",
    );

    expect(source).toContain("shadow-xl shadow-black/10");
  });

  it("uses the same cyan navigation accent language", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain("border-cyan-500/40");

    expect(source).toContain("bg-cyan-500/20");

    expect(source).toContain("text-cyan-200");
  });

  it("preserves all platform routes", () => {
    const source = readProjectFile(
      "src/components/nexus/lumi-platform-navigation.tsx",
    );

    expect(source).toContain('href: "/nexus"');

    expect(source).toContain('href: "/nexus/power"');

    expect(source).toContain('href: "/nexus/energy"');

    expect(source).toContain('href: "/hvac"');
  });
});
