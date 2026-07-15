import { z } from "zod";

import {
  nexusAssetStatusSchema,
  nexusCriticalitySchema,
  nexusIsoDateTimeSchema,
  nexusMetadataSchema,
  nexusTwinTypeSchema,
} from "@/nexus/contracts/common";

export const nexusAssetSchema = z.object({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(200),
  twinType: nexusTwinTypeSchema,
  assetType: z.string().trim().min(1).max(100),
  siteId: z.string().trim().min(1).max(128),
  terminalId: z.string().trim().min(1).max(128).optional(),
  zoneId: z.string().trim().min(1).max(128).optional(),
  parentAssetId: z.string().trim().min(1).max(128).optional(),
  status: nexusAssetStatusSchema,
  healthScore: z.number().min(0).max(100).optional(),
  criticality: nexusCriticalitySchema,
  metadata: nexusMetadataSchema.default({}),
  createdAt: nexusIsoDateTimeSchema,
  updatedAt: nexusIsoDateTimeSchema,
});

export type NexusAsset = z.infer<typeof nexusAssetSchema>;

export const createNexusAssetSchema = nexusAssetSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type CreateNexusAsset = z.input<typeof createNexusAssetSchema>;
