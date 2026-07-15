import type { NexusAsset } from "@/nexus/contracts";
import { createHvacNexusAssets } from "@/nexus/integrations/hvac/hvac-asset-adapter";
import { createPowerNexusAssets } from "@/nexus/integrations/power/power-asset-adapter";
import { nexusAssetRegistry } from "@/nexus/registry/default-nexus-asset-registry";

let initializationPromise: Promise<NexusAsset[]> | null = null;

export function initializeNexusAssets(): Promise<NexusAsset[]> {
  initializationPromise ??= nexusAssetRegistry.registerMany([
    ...createHvacNexusAssets(),
    ...createPowerNexusAssets(),
  ]);

  return initializationPromise;
}
