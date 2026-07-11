import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { simulationScenarios } from "@/data/demo/simulation-scenarios";

import { applyScenario } from "@/lib/scenarios/scenario-engine";

import { appendAuditRecord } from "@/services/audit-repository";

import type { PlantState } from "@/types/hvac";

const requestSchema = z.object({
  scenarioId: z.string().min(1),
  state: z.unknown(),
  actor: z.string().default("Operator"),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());

    const scenario = simulationScenarios.find(
      (item) => item.scenarioId === body.scenarioId,
    );

    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: "Simulation scenario was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const previousState = body.state as PlantState;

    const resultingState = applyScenario(previousState, scenario);

    const executionId = randomUUID();

    appendAuditRecord({
      auditId: randomUUID(),
      timestamp: new Date().toISOString(),
      actor: body.actor,
      source: "simulation",
      action: "EXECUTE_SCENARIO",
      module: "Simulation Scenarios",
      recordId: executionId,
      oldValue: {
        operatingMode: previousState.operatingMode,
        expectedPassengers: previousState.expectedPassengers,
      },
      newValue: {
        scenarioId: scenario.scenarioId,
        operatingMode: resultingState.operatingMode,
        expectedPassengers: resultingState.expectedPassengers,
      },
      result: "success",
      details: `Executed simulation scenario: ${scenario.name}`,
    });

    return NextResponse.json({
      success: true,
      execution: {
        executionId,
        scenarioId: scenario.scenarioId,
        scenarioName: scenario.name,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        summary: scenario.description,
        previousState,
        resultingState,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Scenario execution failed.",
      },
      {
        status: 400,
      },
    );
  }
}
