import {
  energyPerformanceInputSchema,
  energyPerformanceResultSchema,
  type EnergyPerformanceInput,
  type EnergyPerformanceResult,
} from "@/domains/energy/energy-contracts";

export function calculateEnergyPerformance(
  input: EnergyPerformanceInput,
): EnergyPerformanceResult {
  const validated = energyPerformanceInputSchema.parse(input);

  const energySavingKwh =
    validated.baselineEnergyKwh - validated.actualEnergyKwh;

  const energySavingPercent =
    validated.baselineEnergyKwh > 0
      ? (energySavingKwh / validated.baselineEnergyKwh) * 100
      : 0;

  return energyPerformanceResultSchema.parse({
    actualEnergyKwh: validated.actualEnergyKwh,
    baselineEnergyKwh: validated.baselineEnergyKwh,
    energySavingKwh,
    energySavingPercent,
    estimatedCostSaving: energySavingKwh * validated.tariffPerKwh,
    estimatedAvoidedCarbonKgCo2e:
      energySavingKwh * validated.carbonFactorKgCo2ePerKwh,
    modelDerived: true,
  });
}
