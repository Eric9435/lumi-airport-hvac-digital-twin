import type {
  NexusAsset,
  NexusAssetStatus,
  NexusTwinType,
} from "@/nexus/contracts";
import type {
  NexusAssetQuery,
  NexusAssetRepository,
} from "@/nexus/registry/nexus-asset-repository";

function matchesOptionalValue<T>(
  actual: T | undefined,
  expected: T | undefined,
): boolean {
  return expected === undefined || actual === expected;
}

function matchesQuery(asset: NexusAsset, query: NexusAssetQuery): boolean {
  return (
    matchesOptionalValue<NexusTwinType>(asset.twinType, query.twinType) &&
    matchesOptionalValue<string>(asset.assetType, query.assetType) &&
    matchesOptionalValue<string>(asset.siteId, query.siteId) &&
    matchesOptionalValue<string>(asset.terminalId, query.terminalId) &&
    matchesOptionalValue<string>(asset.zoneId, query.zoneId) &&
    matchesOptionalValue<string>(asset.parentAssetId, query.parentAssetId) &&
    matchesOptionalValue<NexusAssetStatus>(asset.status, query.status)
  );
}

export class InMemoryNexusAssetRepository implements NexusAssetRepository {
  private readonly assets = new Map<string, NexusAsset>();

  async save(asset: NexusAsset): Promise<NexusAsset> {
    const storedAsset = structuredClone(asset);

    this.assets.set(storedAsset.id, storedAsset);

    return structuredClone(storedAsset);
  }

  async saveMany(assets: NexusAsset[]): Promise<NexusAsset[]> {
    return Promise.all(assets.map((asset) => this.save(asset)));
  }

  async findById(id: string): Promise<NexusAsset | null> {
    const asset = this.assets.get(id);

    return asset ? structuredClone(asset) : null;
  }

  async findMany(query: NexusAssetQuery = {}): Promise<NexusAsset[]> {
    return Array.from(this.assets.values())
      .filter((asset) => matchesQuery(asset, query))
      .map((asset) => structuredClone(asset))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async exists(id: string): Promise<boolean> {
    return this.assets.has(id);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }

  async count(query: NexusAssetQuery = {}): Promise<number> {
    const assets = await this.findMany(query);

    return assets.length;
  }

  async clear(): Promise<void> {
    this.assets.clear();
  }
}
