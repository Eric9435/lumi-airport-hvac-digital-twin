import { randomUUID } from "node:crypto";

import type { NexusAgentFinding } from "@/nexus/contracts";
import type {
  NexusAgent,
  NexusAgentExecutionContext,
  NexusAgentRunRequest,
} from "@/nexus/agents/nexus-agent";

function readFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  return value;
}

export const energyIntelligenceAgent: NexusAgent = {
  agentId: "energy-intelligence-agent",
  name: "Energy Intelligence Agent",
  description:
    "Calculates deterministic energy, cost and avoided-carbon estimates from supplied model inputs.",
  supportedTwins: ["hvac", "energy"],
  deterministic: true,
  llmReady: true,

  async run(
    request: NexusAgentRunRequest,
    context: NexusAgentExecutionContext,
  ): Promise<NexusAgentFinding[]> {
    const parameters = request.parameters ?? {};

    const actualEnergyKwh = readFiniteNumber(
      parameters.actualEnergyKwh,
      "actualEnergyKwh",
    );

    const baselineEnergyKwh = readFiniteNumber(
      parameters.baselineEnergyKwh,
      "baselineEnergyKwh",
    );

    const tariffMmkPerKwh =
      parameters.tariffMmkPerKwh === undefined
        ? 900
        : readFiniteNumber(parameters.tariffMmkPerKwh, "tariffMmkPerKwh");

    const carbonFactorKgPerKwh =
      parameters.carbonFactorKgPerKwh === undefined
        ? 0.45
        : readFiniteNumber(
            parameters.carbonFactorKgPerKwh,
            "carbonFactorKgPerKwh",
          );

    const energySavingKwh = Math.max(0, baselineEnergyKwh - actualEnergyKwh);

    const savingPercent =
      baselineEnergyKwh > 0 ? (energySavingKwh / baselineEnergyKwh) * 100 : 0;

    const avoidedCarbonKg = energySavingKwh * carbonFactorKgPerKwh;

    const costSavingMmk = energySavingKwh * tariffMmkPerKwh;

    const hasSaving = energySavingKwh > 0;

    return [
      {
        findingId: randomUUID(),
        agentId: "energy-intelligence-agent",
        sourceTwin: request.targetTwin ?? "energy",
        assetId: request.targetAssetId,
        title: hasSaving
          ? "Estimated energy-saving opportunity identified"
          : "No modeled energy saving identified",
        explanation:
          `Compared ${actualEnergyKwh.toFixed(2)} kWh of modeled consumption ` +
          `with a ${baselineEnergyKwh.toFixed(2)} kWh baseline. ` +
          `Estimated saving: ${energySavingKwh.toFixed(2)} kWh ` +
          `(${savingPercent.toFixed(2)}%).`,
        evidence: [
          {
            source: "deterministic-energy-calculation",
            description: "Model-derived energy, cost and carbon comparison.",
            value: {
              actualEnergyKwh,
              baselineEnergyKwh,
              energySavingKwh,
              savingPercent,
              tariffMmkPerKwh,
              costSavingMmk,
              carbonFactorKgPerKwh,
              avoidedCarbonKg,
            },
            timestamp: context.now().toISOString(),
          },
        ],
        confidence: 1,
        severity: hasSaving ? "info" : "low",
        recommendedActions: hasSaving
          ? [
              {
                actionId: randomUUID(),
                title: "Validate against operational baseline",
                description:
                  "Compare the model-derived estimate with verified before-and-after meter data before presenting it as a real-world saving.",
                priority: "medium",
                requiresHumanApproval: false,
                commandAction: "energy.baseline.validate",
                parameters: {
                  actualEnergyKwh,
                  baselineEnergyKwh,
                },
              },
            ]
          : [],
        createdAt: context.now().toISOString(),
      },
    ];
  },
};
