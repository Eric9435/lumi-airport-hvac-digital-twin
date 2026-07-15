import { z } from "zod";

export const powerAssetTypeSchema = z.enum([
  "utility-incomer",
  "transformer",
  "generator",
  "automatic-transfer-switch",
  "switchboard",
  "feeder",
  "ups",
  "electrical-meter",
]);

export type PowerAssetType = z.infer<typeof powerAssetTypeSchema>;

export const powerAssetStatusSchema = z.enum([
  "online",
  "offline",
  "energized",
  "de-energized",
  "standby",
  "running",
  "warning",
  "fault",
  "maintenance",
]);

export type PowerAssetStatus = z.infer<typeof powerAssetStatusSchema>;

export const powerAssetSchema = z.object({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(200),
  assetType: powerAssetTypeSchema,
  siteId: z.string().trim().min(1).max(128),
  parentAssetId: z.string().trim().min(1).max(128).optional(),
  status: powerAssetStatusSchema,

  ratedVoltageV: z.number().positive().optional(),
  ratedCurrentA: z.number().nonnegative().optional(),
  ratedPowerKva: z.number().nonnegative().optional(),
  ratedPowerKw: z.number().nonnegative().optional(),

  voltageV: z.number().nonnegative().optional(),
  currentA: z.number().nonnegative().optional(),
  activePowerKw: z.number().optional(),
  reactivePowerKvar: z.number().optional(),
  apparentPowerKva: z.number().nonnegative().optional(),
  powerFactor: z.number().min(-1).max(1).optional(),
  frequencyHz: z.number().positive().optional(),
  loadPercent: z.number().min(0).max(200).optional(),

  healthScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.string().datetime({ offset: true }),
});

export type PowerAsset = z.infer<typeof powerAssetSchema>;

export const createPowerAssetSchema = powerAssetSchema.omit({
  updatedAt: true,
});

export type CreatePowerAsset = z.input<typeof createPowerAssetSchema>;

export const powerQualityReadingSchema = z.object({
  readingId: z.string().trim().min(1).max(128),
  assetId: z.string().trim().min(1).max(128),
  timestamp: z.string().datetime({ offset: true }),

  voltageL1V: z.number().nonnegative(),
  voltageL2V: z.number().nonnegative(),
  voltageL3V: z.number().nonnegative(),

  currentL1A: z.number().nonnegative(),
  currentL2A: z.number().nonnegative(),
  currentL3A: z.number().nonnegative(),

  frequencyHz: z.number().positive(),
  powerFactor: z.number().min(-1).max(1),

  voltageUnbalancePercent: z.number().min(0).max(100),
  currentUnbalancePercent: z.number().min(0).max(100),

  totalHarmonicDistortionVoltagePercent: z.number().min(0).max(100).optional(),

  totalHarmonicDistortionCurrentPercent: z.number().min(0).max(100).optional(),
});

export type PowerQualityReading = z.infer<typeof powerQualityReadingSchema>;
