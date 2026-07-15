import { InMemoryNexusAssetRepository } from "@/nexus/registry/in-memory-nexus-asset-repository";
import { NexusAssetRegistry } from "@/nexus/registry/nexus-asset-registry";

declare global {
  var __lumiNexusAssetRepository: InMemoryNexusAssetRepository | undefined;

  var __lumiNexusAssetRegistry: NexusAssetRegistry | undefined;
}

const repository =
  globalThis.__lumiNexusAssetRepository ?? new InMemoryNexusAssetRepository();

const registry =
  globalThis.__lumiNexusAssetRegistry ?? new NexusAssetRegistry(repository);

if (process.env.NODE_ENV !== "production") {
  globalThis.__lumiNexusAssetRepository = repository;
  globalThis.__lumiNexusAssetRegistry = registry;
}

export const nexusAssetRepository = repository;
export const nexusAssetRegistry = registry;
