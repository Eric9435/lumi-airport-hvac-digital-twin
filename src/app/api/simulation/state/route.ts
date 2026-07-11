import { NextResponse } from "next/server";

import { initialPlantState } from "@/lib/simulation/initial-state";

export async function GET() {
  return NextResponse.json({
    success: true,
    state: initialPlantState,
  });
}
