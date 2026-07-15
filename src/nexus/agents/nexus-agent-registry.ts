import type { NexusAgent } from "@/nexus/agents/nexus-agent";
import {
  NexusAgentConflictError,
  NexusAgentNotFoundError,
} from "@/nexus/agents/nexus-agent-errors";
import type { NexusTwinType } from "@/nexus/contracts";

export class NexusAgentRegistry {
  private readonly agents = new Map<string, NexusAgent>();

  register(agent: NexusAgent): void {
    if (this.agents.has(agent.agentId)) {
      throw new NexusAgentConflictError(
        `Nexus agent ${agent.agentId} is already registered.`,
      );
    }

    this.agents.set(agent.agentId, agent);
  }

  registerMany(agents: NexusAgent[]): void {
    for (const agent of agents) {
      this.register(agent);
    }
  }

  get(agentId: string): NexusAgent {
    const agent = this.agents.get(agentId);

    if (!agent) {
      throw new NexusAgentNotFoundError(
        `Nexus agent ${agentId} was not found.`,
      );
    }

    return agent;
  }

  list(twinType?: NexusTwinType): NexusAgent[] {
    return Array.from(this.agents.values())
      .filter(
        (agent) =>
          twinType === undefined || agent.supportedTwins.includes(twinType),
      )
      .sort((left, right) => left.agentId.localeCompare(right.agentId));
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  clear(): void {
    this.agents.clear();
  }
}
