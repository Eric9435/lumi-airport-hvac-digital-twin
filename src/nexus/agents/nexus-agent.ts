import type { NexusAgentFinding, NexusTwinType } from "@/nexus/contracts";
import type { NexusEventBus } from "@/nexus/events";
import type { NexusAssetRegistry } from "@/nexus/registry";
import type { NexusToolRegistry } from "@/nexus/agents/nexus-tool-registry";

export interface NexusAgentRunRequest {
  correlationId: string;
  requestedBy: string;
  targetTwin?: NexusTwinType;
  targetAssetId?: string;
  parameters?: Record<string, unknown>;
}

export interface NexusAgentExecutionContext {
  assetRegistry: NexusAssetRegistry;
  eventBus: NexusEventBus;
  toolRegistry: NexusToolRegistry;
  now: () => Date;
}

export interface NexusAgent {
  readonly agentId: string;
  readonly name: string;
  readonly description: string;
  readonly supportedTwins: readonly NexusTwinType[];
  readonly deterministic: true;
  readonly llmReady: boolean;

  run(
    request: NexusAgentRunRequest,
    context: NexusAgentExecutionContext,
  ): Promise<NexusAgentFinding[]>;
}
