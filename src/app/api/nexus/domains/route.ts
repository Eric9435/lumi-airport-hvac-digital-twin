import { NextResponse } from "next/server";

import { listNexusDomains } from "@/nexus/domains";

export async function GET(): Promise<NextResponse> {
  const domains = listNexusDomains();

  return NextResponse.json(
    {
      count: domains.length,
      enabledCount: domains.filter((domain) => domain.enabled).length,
      domains,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
