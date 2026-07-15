import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("LUMI Nexus entry routing", () => {
  it("redirects the application root to the Nexus Command Center", () => {
    const rootPage = readFileSync(
      resolve(process.cwd(), "src/app/page.tsx"),
      "utf8",
    );

    expect(rootPage).toContain('redirect("/nexus")');
  });

  it("preserves the HVAC Digital Twin under /hvac", () => {
    const hvacPage = readFileSync(
      resolve(process.cwd(), "src/app/hvac/page.tsx"),
      "utf8",
    );

    expect(hvacPage.trim().length).toBeGreaterThan(0);
  });
});
