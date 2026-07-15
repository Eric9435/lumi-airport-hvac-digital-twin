import {
  createPowerAssetSchema,
  powerAssetSchema,
  type CreatePowerAsset,
  type PowerAsset,
  type PowerAssetStatus,
  type PowerAssetType,
} from "@/domains/power/power-contracts";

export interface PowerAssetQuery {
  assetType?: PowerAssetType;
  status?: PowerAssetStatus;
  siteId?: string;
  parentAssetId?: string;
}

function matchesQuery(asset: PowerAsset, query: PowerAssetQuery): boolean {
  return (
    (query.assetType === undefined || asset.assetType === query.assetType) &&
    (query.status === undefined || asset.status === query.status) &&
    (query.siteId === undefined || asset.siteId === query.siteId) &&
    (query.parentAssetId === undefined ||
      asset.parentAssetId === query.parentAssetId)
  );
}

export class InMemoryPowerAssetRepository {
  private readonly assets = new Map<string, PowerAsset>();

  async save(input: CreatePowerAsset): Promise<PowerAsset> {
    const parsed = createPowerAssetSchema.parse(input);

    const asset = powerAssetSchema.parse({
      ...parsed,
      updatedAt: new Date().toISOString(),
    });

    this.assets.set(asset.id, structuredClone(asset));

    return structuredClone(asset);
  }

  async saveMany(inputs: CreatePowerAsset[]): Promise<PowerAsset[]> {
    const assets: PowerAsset[] = [];

    for (const input of inputs) {
      assets.push(await this.save(input));
    }

    return assets;
  }

  async findById(id: string): Promise<PowerAsset | null> {
    const asset = this.assets.get(id);

    return asset ? structuredClone(asset) : null;
  }

  async findMany(query: PowerAssetQuery = {}): Promise<PowerAsset[]> {
    return Array.from(this.assets.values())
      .filter((asset) => matchesQuery(asset, query))
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((asset) => structuredClone(asset));
  }

  async count(query: PowerAssetQuery = {}): Promise<number> {
    return (await this.findMany(query)).length;
  }

  async clear(): Promise<void> {
    this.assets.clear();
  }
}
