import type {
  NexusAsset,
  NexusAssetStatus,
  NexusTwinType,
} from "@/nexus/contracts";

export interface NexusAssetQuery {
  twinType?: NexusTwinType;
  assetType?: string;
  siteId?: string;
  terminalId?: string;
  zoneId?: string;
  parentAssetId?: string;
  status?: NexusAssetStatus;
}

export interface NexusAssetRepository {
  save(asset: NexusAsset): Promise<NexusAsset>;
  saveMany(assets: NexusAsset[]): Promise<NexusAsset[]>;
  findById(id: string): Promise<NexusAsset | null>;
  findMany(query?: NexusAssetQuery): Promise<NexusAsset[]>;
  exists(id: string): Promise<boolean>;
  deleteById(id: string): Promise<boolean>;
  count(query?: NexusAssetQuery): Promise<number>;
  clear(): Promise<void>;
}
