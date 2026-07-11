import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns a healthy response", async () => {
    const response = await GET();

    const body = (await response.json()) as {
      status: string;
      service: string;
      version: string;
      timestamp: string;
    };

    expect(response.status).toBe(200);

    expect(body.status).toBe("ok");

    expect(body.service).toContain("LUMI");

    expect(body.timestamp).toBeTruthy();
  });
});
