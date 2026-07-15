import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Power Twin route", () => {
  it("provides a dedicated Power Twin dashboard", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/nexus/power/page.tsx"),
      "utf8",
    );

    expect(source).toContain("Power Twin");
    expect(source).toContain("Power Operations Agent");
    expect(source).toContain("Electrical Asset Inventory");
  });

  it("provides navigation back to Nexus and HVAC", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/nexus/power/page.tsx"),
      "utf8",
    );

    expect(source).toContain('href="/nexus"');
    expect(source).toContain('href="/hvac"');
  });
});
