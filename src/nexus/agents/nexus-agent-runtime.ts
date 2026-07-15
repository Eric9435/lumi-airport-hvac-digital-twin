import { randomUUID } from "node:crypto";

import type { NexusAgentFinding, NexusTwinType } from "@/nexus/contracts";
import { nexusAgentFindingSchema } from "@/nexus/contracts";
import { NEXUS_EVENT_TYPES } from "@/nexus/events";
import type {
  NexusAgentExecutionContext,
  NexusAgentRunRequest,
} from "@/nexus/agents/nexus-agent";
import { NexusAgentExecutionError } from "@/nexus/agents/nexus-agent-errors";
import type { NexusAgentRegistry } from "@/nexus/agents/nexus-agent-registry";

export interface RunNexusAgentInput {
  agentId: string;
  requestedBy: string;
  targetTwin?: NexusTwinType;
  targetAssetId?: string;
  parameters?: Record<string, unknown>;
  correlationId?: string;
}

export interface NexusAgentRunResult {
  agentId: string;
  correlationId: string;
  deterministic: true;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  findings: NexusAgentFinding[];
}

export class NexusAgentRuntime {
  constructor(
    private readonly agentRegistry: NexusAgentRegistry,
    private readonly context: NexusAgentExecutionContext,
  ) {}

  async run(input: RunNexusAgentInput): Promise<NexusAgentRunResult> {
    const agent = this.agentRegistry.get(input.agentId);
    const correlationId = input.correlationId ?? randomUUID();

    const request: NexusAgentRunRequest = {
      correlationId,
      requestedBy: input.requestedBy,
      targetTwin: input.targetTwin,
      targetAssetId: input.targetAssetId,
      parameters: input.parameters ?? {},
    };

    const startedAtDate = this.context.now();
    const startedAt = startedAtDate.toISOString();

    try {
      const rawFindings = await agent.run(request, this.context);

      const findings = rawFindings.map((finding) =>
        nexusAgentFindingSchema.parse(finding),
      );

      for (const finding of findings) {
        await this.context.eventBus.publish({
          sourceTwin: finding.sourceTwin,
          assetId: finding.assetId,
          eventType: NEXUS_EVENT_TYPES.AGENT_FINDING_CREATED,
          severity: finding.severity,
          correlationId,
          payload: {
            findingId: finding.findingId,
            agentId: finding.agentId,
            title: finding.title,
            confidence: finding.confidence,
            recommendedActionCount: finding.recommendedActions.length,
          },
          requiresHumanApproval: finding.recommendedActions.some(
            (action) => action.requiresHumanApproval,
          ),
        });
      }

      const completedAtDate = this.context.now();

      return {
        agentId: agent.agentId,
        correlationId,
        deterministic: true,
        startedAt,
        completedAt: completedAtDate.toISOString(),
        durationMs: Math.max(
          0,
          completedAtDate.getTime() - startedAtDate.getTime(),
        ),
        findings,
      };
    } catch (error) {
      if (error instanceof NexusAgentExecutionError) {
        throw error;
      }

      throw new NexusAgentExecutionError(
        `Nexus agent ${agent.agentId} failed: ${
          error instanceof Error ? error.message : "Unknown execution error"
        }`,
      );
    }
  }

  async runMany(inputs: RunNexusAgentInput[]): Promise<NexusAgentRunResult[]> {
    const results: NexusAgentRunResult[] = [];

    for (const input of inputs) {
      results.push(await this.run(input));
    }

    return results;
  }
}
