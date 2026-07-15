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
      const routeSource = readProjectFile(file);
      const componentSource =
        file === "src/app/nexus/page.tsx"
          ? readProjectFile(
              "src/components/nexus/command-center/nexus-command-center.tsx",
            )
          : "";

      const source = `${routeSource}\n${componentSource}`;

      expect(source).toContain("min-h-screen");
      expect(source).toContain("bg-slate-950");

      if (file === "src/app/nexus/page.tsx") {
        expect(source).toContain("max-w-[1800px]");
      } else {
        expect(source).toContain("max-w-[1600px]");
      }

      if (file === "src/app/nexus/page.tsx") {
        expect(source).toContain(
          "rounded-3xl border border-slate-800 bg-slate-900/65",
        );
      } else {
        if (file === "src/app/nexus/page.tsx") {
          expect(source).toContain(
            "rounded-3xl border border-slate-800 bg-slate-900/65",
          );
        } else {
          expect(source).toContain("border-b border-slate-800 pb-6");
        }
      }
    },
  );

  it.each(nexusPages)("%s uses the standard LUMI card treatment", (file) => {
    const routeSource = readProjectFile(file);
    const componentSource =
      file === "src/app/nexus/page.tsx"
        ? readProjectFile(
            "src/components/nexus/command-center/nexus-command-center.tsx",
          )
        : "";

    const source = `${routeSource}\n${componentSource}`;

    if (file === "src/app/nexus/page.tsx") {
      expect(source).toContain(
        "rounded-2xl border border-slate-800 bg-slate-900/75",
      );
    } else {
      expect(source).toContain(
        "rounded-2xl border border-slate-800 bg-slate-900/70",
      );
    }

    if (file === "src/app/nexus/page.tsx") {
      expect(source).toContain("shadow-xl shadow-black/15");
    } else {
      expect(source).toContain("shadow-xl shadow-black/10");
    }
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

    expect(source).toContain('href: "/dashboard"');
  });
});
