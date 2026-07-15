import {
  createNexusAssetSchema,
  nexusAssetSchema,
  type CreateNexusAsset,
  type NexusAsset,
} from "@/nexus/contracts";
import type {
  NexusAssetQuery,
  NexusAssetRepository,
} from "@/nexus/registry/nexus-asset-repository";

function createTimestamp(): string {
  return new Date().toISOString();
}

export class NexusAssetRegistry {
  constructor(private readonly repository: NexusAssetRepository) {}

  async register(input: CreateNexusAsset): Promise<NexusAsset> {
    const parsedInput = createNexusAssetSchema.parse(input);
    const existingAsset = await this.repository.findById(parsedInput.id);
    const timestamp = createTimestamp();

    const asset = nexusAssetSchema.parse({
      ...parsedInput,
      createdAt: existingAsset?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    return this.repository.save(asset);
  }

  async registerMany(inputs: CreateNexusAsset[]): Promise<NexusAsset[]> {
    const assets: NexusAsset[] = [];

    for (const input of inputs) {
      assets.push(await this.register(input));
    }

    return assets;
  }

  async getById(id: string): Promise<NexusAsset | null> {
    return this.repository.findById(id);
  }

  async list(query: NexusAssetQuery = {}): Promise<NexusAsset[]> {
    return this.repository.findMany(query);
  }

  async count(query: NexusAssetQuery = {}): Promise<number> {
    return this.repository.count(query);
  }

  async remove(id: string): Promise<boolean> {
    return this.repository.deleteById(id);
  }

  async clear(): Promise<void> {
    await this.repository.clear();
  }
}
