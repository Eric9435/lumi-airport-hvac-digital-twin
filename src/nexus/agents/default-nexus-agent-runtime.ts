import { energyIntelligenceAgent } from "@/nexus/agents/energy-intelligence-agent";
import { hvacOperationsAgent } from "@/nexus/agents/hvac-operations-agent";
import { maintenanceIntelligenceAgent } from "@/nexus/agents/maintenance-intelligence-agent";
import { nexusOrchestratorAgent } from "@/nexus/agents/nexus-orchestrator-agent";
import { NexusAgentRegistry } from "@/nexus/agents/nexus-agent-registry";
import { NexusAgentRuntime } from "@/nexus/agents/nexus-agent-runtime";
import { NexusToolRegistry } from "@/nexus/agents/nexus-tool-registry";
import { nexusEventBus } from "@/nexus/events";
import { nexusAssetRegistry } from "@/nexus/registry";

declare global {
  var __lumiNexusAgentRegistry: NexusAgentRegistry | undefined;

  var __lumiNexusToolRegistry: NexusToolRegistry | undefined;

  var __lumiNexusAgentRuntime: NexusAgentRuntime | undefined;
}

const agentRegistry =
  globalThis.__lumiNexusAgentRegistry ?? new NexusAgentRegistry();

const toolRegistry =
  globalThis.__lumiNexusToolRegistry ?? new NexusToolRegistry();

if (!agentRegistry.has("hvac-operations-agent")) {
  agentRegistry.registerMany([
    hvacOperationsAgent,
    energyIntelligenceAgent,
    maintenanceIntelligenceAgent,
    nexusOrchestratorAgent,
  ]);
}

const runtime =
  globalThis.__lumiNexusAgentRuntime ??
  new NexusAgentRuntime(agentRegistry, {
    assetRegistry: nexusAssetRegistry,
    eventBus: nexusEventBus,
    toolRegistry,
    now: () => new Date(),
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__lumiNexusAgentRegistry = agentRegistry;
  globalThis.__lumiNexusToolRegistry = toolRegistry;
  globalThis.__lumiNexusAgentRuntime = runtime;
}

export const nexusAgentRegistry = agentRegistry;
export const nexusToolRegistry = toolRegistry;
export const nexusAgentRuntime = runtime;
