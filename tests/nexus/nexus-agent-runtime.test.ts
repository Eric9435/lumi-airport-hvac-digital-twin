import { beforeEach, describe, expect, it } from "vitest";

import {
  energyIntelligenceAgent,
  hvacOperationsAgent,
  maintenanceIntelligenceAgent,
  NexusAgentNotFoundError,
  NexusAgentRegistry,
  NexusAgentRuntime,
  NexusToolAuthorizationError,
  NexusToolRegistry,
} from "@/nexus/agents";
import { NexusEventBus } from "@/nexus/events";
import { createHvacNexusAssets } from "@/nexus/integrations/hvac/hvac-asset-adapter";
import {
  InMemoryNexusAssetRepository,
  NexusAssetRegistry,
} from "@/nexus/registry";

describe("NexusAgentRuntime", () => {
  let assetRegistry: NexusAssetRegistry;
  let eventBus: NexusEventBus;
  let agentRegistry: NexusAgentRegistry;
  let toolRegistry: NexusToolRegistry;
  let runtime: NexusAgentRuntime;

  beforeEach(async () => {
    assetRegistry = new NexusAssetRegistry(new InMemoryNexusAssetRepository());

    await assetRegistry.registerMany(createHvacNexusAssets());

    eventBus = new NexusEventBus({
      maxHistorySize: 100,
    });

    agentRegistry = new NexusAgentRegistry();
    agentRegistry.registerMany([
      hvacOperationsAgent,
      energyIntelligenceAgent,
      maintenanceIntelligenceAgent,
    ]);

    toolRegistry = new NexusToolRegistry();

    runtime = new NexusAgentRuntime(agentRegistry, {
      assetRegistry,
      eventBus,
      toolRegistry,
      now: () => new Date("2026-07-15T00:00:00.000Z"),
    });
  });

  it("runs the HVAC Operations Agent deterministically", async () => {
    const result = await runtime.run({
      agentId: "hvac-operations-agent",
      requestedBy: "test-user",
      targetTwin: "hvac",
      correlationId: "test-correlation",
    });

    expect(result.deterministic).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.confidence).toBe(1);
    expect(result.findings[0]?.explanation).toContain("36 HVAC assets");

    expect(
      eventBus.getHistory({
        eventType: "agent-finding.created",
      }),
    ).toHaveLength(1);
  });

  it("calculates model-derived energy estimates", async () => {
    const result = await runtime.run({
      agentId: "energy-intelligence-agent",
      requestedBy: "test-user",
      targetTwin: "energy",
      parameters: {
        actualEnergyKwh: 1819.9,
        baselineEnergyKwh: 2038.29,
        tariffMmkPerKwh: 900,
        carbonFactorKgPerKwh: 0.45,
      },
    });

    const evidenceValue = result.findings[0]?.evidence[0]?.value as
      Record<string, unknown> | undefined;

    expect(evidenceValue?.energySavingKwh).toBeCloseTo(218.39, 2);

    expect(evidenceValue?.avoidedCarbonKg).toBeCloseTo(98.2755, 4);

    expect(evidenceValue?.costSavingMmk).toBeCloseTo(196551, 0);
  });

  it("identifies degraded assets for maintenance review", async () => {
    await assetRegistry.register({
      id: "CH-01",
      name: "Chiller 01",
      twinType: "hvac",
      assetType: "chiller",
      siteId: "YIA",
      status: "warning",
      healthScore: 60,
      criticality: "critical",
      metadata: {},
    });

    const result = await runtime.run({
      agentId: "maintenance-intelligence-agent",
      requestedBy: "test-user",
      targetTwin: "hvac",
    });

    expect(result.findings[0]?.severity).toBe("medium");
    expect(result.findings[0]?.recommendedActions).toHaveLength(1);
  });

  it("rejects unknown agent identifiers", async () => {
    await expect(
      runtime.run({
        agentId: "unknown-agent",
        requestedBy: "test-user",
      }),
    ).rejects.toBeInstanceOf(NexusAgentNotFoundError);
  });

  it("enforces tool permissions", async () => {
    toolRegistry.register<{ value: number }, number>({
      toolId: "test.secure-tool",
      description: "Secure test tool",
      requiredPermission: "nexus:test:execute",
      async execute(input) {
        return input.value * 2;
      },
    });

    await expect(
      toolRegistry.execute(
        "test.secure-tool",
        {
          value: 5,
        },
        {
          agentId: "test-agent",
          requestedBy: "test-user",
          permissions: [],
          correlationId: "test-correlation",
        },
      ),
    ).rejects.toBeInstanceOf(NexusToolAuthorizationError);

    await expect(
      toolRegistry.execute<{ value: number }, number>(
        "test.secure-tool",
        {
          value: 5,
        },
        {
          agentId: "test-agent",
          requestedBy: "test-user",
          permissions: ["nexus:test:execute"],
          correlationId: "test-correlation",
        },
      ),
    ).resolves.toBe(10);
  });
});
