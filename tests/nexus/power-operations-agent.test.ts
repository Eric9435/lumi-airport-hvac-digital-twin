import { beforeEach, describe, expect, it } from "vitest";

import {
  NexusAgentRegistry,
  NexusAgentRuntime,
  NexusToolRegistry,
  powerOperationsAgent,
} from "@/nexus/agents";
import { NexusEventBus } from "@/nexus/events";
import { createPowerNexusAssets } from "@/nexus/integrations/power";
import {
  InMemoryNexusAssetRepository,
  NexusAssetRegistry,
} from "@/nexus/registry";

describe("Power Operations Agent", () => {
  let assetRegistry: NexusAssetRegistry;
  let eventBus: NexusEventBus;
  let runtime: NexusAgentRuntime;

  beforeEach(async () => {
    assetRegistry = new NexusAssetRegistry(new InMemoryNexusAssetRepository());

    await assetRegistry.registerMany(createPowerNexusAssets());

    eventBus = new NexusEventBus({
      maxHistorySize: 100,
    });

    const agentRegistry = new NexusAgentRegistry();
    agentRegistry.register(powerOperationsAgent);

    runtime = new NexusAgentRuntime(agentRegistry, {
      assetRegistry,
      eventBus,
      toolRegistry: new NexusToolRegistry(),
      now: () => new Date("2026-07-15T00:00:00.000Z"),
    });
  });

  it("evaluates the Power Twin foundation", async () => {
    const result = await runtime.run({
      agentId: "power-operations-agent",
      requestedBy: "test-user",
      targetTwin: "power",
      correlationId: "power-test-001",
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.sourceTwin).toBe("power");
    expect(result.findings[0]?.confidence).toBe(1);
    expect(result.findings[0]?.explanation).toContain("7 Power Twin assets");
  });

  it("detects transformer overload", async () => {
    await assetRegistry.register({
      id: "POWER-TR-01",
      name: "Airport Transformer 01",
      twinType: "power",
      assetType: "transformer",
      siteId: "YIA",
      parentAssetId: "POWER-UTILITY-01",
      status: "online",
      healthScore: 85,
      criticality: "high",
      metadata: {
        source: "test",
        ratedVoltageV: 400,
        voltageV: 400,
        frequencyHz: 50,
        loadPercent: 105,
      },
    });

    const result = await runtime.run({
      agentId: "power-operations-agent",
      requestedBy: "test-user",
      targetTwin: "power",
      targetAssetId: "POWER-TR-01",
    });

    expect(result.findings[0]?.severity).toBe("critical");

    expect(
      result.findings[0]?.recommendedActions.some(
        (action) => action.requiresHumanApproval,
      ),
    ).toBe(true);
  });

  it("detects critical voltage deviation", async () => {
    await assetRegistry.register({
      id: "POWER-TR-02",
      name: "Airport Transformer 02",
      twinType: "power",
      assetType: "transformer",
      siteId: "YIA",
      parentAssetId: "POWER-UTILITY-01",
      status: "online",
      healthScore: 90,
      criticality: "high",
      metadata: {
        source: "test",
        ratedVoltageV: 400,
        voltageV: 350,
        frequencyHz: 50,
        loadPercent: 60,
      },
    });

    const result = await runtime.run({
      agentId: "power-operations-agent",
      requestedBy: "test-user",
      targetTwin: "power",
      targetAssetId: "POWER-TR-02",
    });

    expect(result.findings[0]?.severity).toBe("critical");
  });

  it("detects a running generator with no output voltage", async () => {
    await assetRegistry.register({
      id: "POWER-GEN-01",
      name: "Emergency Generator 01",
      twinType: "power",
      assetType: "generator",
      siteId: "YIA",
      status: "running",
      healthScore: 80,
      criticality: "critical",
      metadata: {
        source: "test",
        ratedVoltageV: 400,
        voltageV: 0,
        frequencyHz: 50,
        loadPercent: 0,
      },
    });

    const result = await runtime.run({
      agentId: "power-operations-agent",
      requestedBy: "test-user",
      targetTwin: "power",
      targetAssetId: "POWER-GEN-01",
    });

    const evidenceValue = result.findings[0]?.evidence[0]?.value as
      | {
          assessments?: Array<{
            issueCode?: string;
          }>;
        }
      | undefined;

    expect(
      evidenceValue?.assessments?.some(
        (assessment) => assessment.issueCode === "GENERATOR-NO-OUTPUT",
      ),
    ).toBe(true);
  });

  it("publishes a Nexus finding event", async () => {
    await runtime.run({
      agentId: "power-operations-agent",
      requestedBy: "test-user",
      targetTwin: "power",
    });

    expect(
      eventBus.getHistory({
        sourceTwin: "power",
        eventType: "agent-finding.created",
      }),
    ).toHaveLength(1);
  });
});
