import { z } from "zod";

export const energySourceTypeSchema = z.enum([
  "utility-grid",
  "generator",
  "solar-pv",
  "battery-storage",
]);

export type EnergySourceType = z.infer<typeof energySourceTypeSchema>;

export const energyBaselineSchema = z.object({
  baselineId: z.string().trim().min(1).max(128),
  siteId: z.string().trim().min(1).max(128),
  domain: z.string().trim().min(1).max(100),
  periodStart: z.string().datetime({ offset: true }),
  periodEnd: z.string().datetime({ offset: true }),
  baselineEnergyKwh: z.number().nonnegative(),
  method: z.enum([
    "configured",
    "historical-average",
    "regression",
    "weather-normalized",
    "verified-meter-baseline",
  ]),
  verified: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
});

export type EnergyBaseline = z.infer<typeof energyBaselineSchema>;

export const energyTariffSchema = z.object({
  tariffId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(200),
  currency: z.string().trim().min(3).max(3),
  energyRatePerKwh: z.number().nonnegative(),
  demandRatePerKw: z.number().nonnegative().optional(),
  validFrom: z.string().datetime({ offset: true }),
  validTo: z.string().datetime({ offset: true }).optional(),
});

export type EnergyTariff = z.infer<typeof energyTariffSchema>;

export const carbonFactorSchema = z.object({
  factorId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(200),
  kgCo2ePerKwh: z.number().nonnegative(),
  source: z.string().trim().min(1).max(500),
  validFrom: z.string().datetime({ offset: true }),
  validTo: z.string().datetime({ offset: true }).optional(),
  verified: z.boolean(),
});

export type CarbonFactor = z.infer<typeof carbonFactorSchema>;

export const energyPerformanceInputSchema = z.object({
  actualEnergyKwh: z.number().nonnegative(),
  baselineEnergyKwh: z.number().nonnegative(),
  tariffPerKwh: z.number().nonnegative(),
  carbonFactorKgCo2ePerKwh: z.number().nonnegative(),
});

export type EnergyPerformanceInput = z.infer<
  typeof energyPerformanceInputSchema
>;

export const energyPerformanceResultSchema = z.object({
  actualEnergyKwh: z.number().nonnegative(),
  baselineEnergyKwh: z.number().nonnegative(),
  energySavingKwh: z.number(),
  energySavingPercent: z.number(),
  estimatedCostSaving: z.number(),
  estimatedAvoidedCarbonKgCo2e: z.number(),
  modelDerived: z.literal(true),
});

export type EnergyPerformanceResult = z.infer<
  typeof energyPerformanceResultSchema
>;
