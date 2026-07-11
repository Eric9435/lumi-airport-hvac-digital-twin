import { NextResponse } from "next/server";

import { simulationScenarios } from "@/data/demo/simulation-scenarios";

export async function GET() {
  return NextResponse.json({
    success: true,
    scenarios: simulationScenarios,
  });
}
