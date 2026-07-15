import {
  powerTwinSeedAssets,
  InMemoryPowerAssetRepository,
} from "@/domains/power";
import { nexusAgentRegistry } from "@/nexus/agents";
import { nexusApprovalService } from "@/nexus/approvals";
import type { NexusAsset, NexusEvent, NexusTwinType } from "@/nexus/contracts";
import { listNexusDomains, type NexusDomainDescriptor } from "@/nexus/domains";
import { nexusEventBus } from "@/nexus/events";
import { initializeNexusAssets, nexusAssetRegistry } from "@/nexus/registry";

export interface NexusPlatformAgentSummary {
  agentId: string;
  name: string;
  description: string;
  supportedTwins: readonly NexusTwinType[];
  deterministic: true;
  llmReady: boolean;
}

export interface NexusPlatformApprovalSummary {
  approvalId: string;
  commandId: string;
  targetTwin: NexusTwinType;
  targetAssetId?: string;
  action: string;
  riskLevel: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
}

export interface NexusPlatformSnapshot {
  generatedAt: string;
  platform: {
    name: "LUMI Nexus";
    description: string;
    architecture: "modular-monolith";
    industryAlignment: "Industry 5.0";
    simulationOnly: true;
  };
  health: {
    status: "operational" | "degraded";
    connectedDomains: number;
    enabledDomains: number;
    registeredNexusAssets: number;
    powerFoundationAssets: number;
    recentEvents: number;
    registeredAgents: number;
    pendingApprovals: number;
  };
  domains: NexusDomainDescriptor[];
  assets: NexusAsset[];
  recentEvents: NexusEvent[];
  agents: NexusPlatformAgentSummary[];
  approvals: NexusPlatformApprovalSummary[];
}

const powerRepository = new InMemoryPowerAssetRepository();

let powerInitializationPromise: Promise<void> | undefined;

async function initializePowerFoundation(): Promise<void> {
  powerInitializationPromise ??= powerRepository
    .saveMany(powerTwinSeedAssets)
    .then(() => undefined);

  await powerInitializationPromise;
}

export async function initializeNexusPlatform(): Promise<void> {
  await Promise.all([initializeNexusAssets(), initializePowerFoundation()]);
}

export async function createNexusPlatformSnapshot(
  eventLimit = 20,
): Promise<NexusPlatformSnapshot> {
  await initializeNexusPlatform();

  const [domains, assets, powerAssets, approvals] = await Promise.all([
    Promise.resolve(listNexusDomains()),
    nexusAssetRegistry.list(),
    powerRepository.findMany(),
    nexusApprovalService.list(),
  ]);

  const agents = nexusAgentRegistry.list().map((agent) => ({
    agentId: agent.agentId,
    name: agent.name,
    description: agent.description,
    supportedTwins: agent.supportedTwins,
    deterministic: agent.deterministic,
    llmReady: agent.llmReady,
  }));

  const recentEvents = nexusEventBus.getHistory({}, eventLimit).reverse();

  const pendingApprovals = approvals.filter(
    (approval) => approval.status === "pending",
  );

  const enabledDomains = domains.filter((domain) => domain.enabled);

  const degraded =
    assets.some((asset) =>
      ["fault", "offline", "unavailable"].includes(asset.status),
    ) ||
    domains.some((domain) => domain.enabled && domain.maturity === "planned");

  return {
    generatedAt: new Date().toISOString(),
    platform: {
      name: "LUMI Nexus",
      description: "Autonomous Airport Infrastructure Intelligence Platform",
      architecture: "modular-monolith",
      industryAlignment: "Industry 5.0",
      simulationOnly: true,
    },
    health: {
      status: degraded ? "degraded" : "operational",
      connectedDomains: domains.length,
      enabledDomains: enabledDomains.length,
      registeredNexusAssets: assets.length,
      powerFoundationAssets: powerAssets.length,
      recentEvents: recentEvents.length,
      registeredAgents: agents.length,
      pendingApprovals: pendingApprovals.length,
    },
    domains,
    assets,
    recentEvents,
    agents,
    approvals: approvals.map((approval) => ({
      approvalId: approval.approvalId,
      commandId: approval.commandId,
      targetTwin: approval.targetTwin,
      targetAssetId: approval.targetAssetId,
      action: approval.action,
      riskLevel: approval.riskLevel,
      status: approval.status,
      requestedBy: approval.requestedBy,
      requestedAt: approval.requestedAt,
      expiresAt: approval.expiresAt,
    })),
  };
}
