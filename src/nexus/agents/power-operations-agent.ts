import { randomUUID } from "node:crypto";

import type { NexusAgentFinding, NexusSeverity } from "@/nexus/contracts";
import type {
  NexusAgent,
  NexusAgentExecutionContext,
  NexusAgentRunRequest,
} from "@/nexus/agents/nexus-agent";

interface PowerAssetAssessment {
  assetId: string;
  name: string;
  issueCode: string;
  explanation: string;
  severity: NexusSeverity;
  observedValue?: number | string;
  expectedRange?: string;
}

function readNumber(
  metadata: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = metadata[key];

  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readString(
  metadata: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = metadata[key];

  return typeof value === "string" ? value : undefined;
}

function assessPowerAsset(
  asset: Awaited<
    ReturnType<NexusAgentExecutionContext["assetRegistry"]["list"]>
  >[number],
): PowerAssetAssessment[] {
  const assessments: PowerAssetAssessment[] = [];
  const metadata = asset.metadata;

  const loadPercent = readNumber(metadata, "loadPercent");
  const voltageV = readNumber(metadata, "voltageV");
  const ratedVoltageV = readNumber(metadata, "ratedVoltageV");
  const frequencyHz = readNumber(metadata, "frequencyHz");

  if (
    asset.status === "fault" ||
    asset.status === "offline" ||
    asset.status === "unavailable"
  ) {
    assessments.push({
      assetId: asset.id,
      name: asset.name,
      issueCode: "POWER-ASSET-UNAVAILABLE",
      explanation: `${asset.name} is currently in ${asset.status} state and requires immediate operational review.`,
      severity: "critical",
      observedValue: asset.status,
      expectedRange: "online, running or standby",
    });
  }

  if (loadPercent !== undefined) {
    if (loadPercent >= 100) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "POWER-OVERLOAD",
        explanation: `${asset.name} is operating at ${loadPercent.toFixed(1)}% loading.`,
        severity: "critical",
        observedValue: loadPercent,
        expectedRange: "below 100%",
      });
    } else if (loadPercent >= 90) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "POWER-HIGH-LOAD",
        explanation: `${asset.name} is approaching its rated loading limit at ${loadPercent.toFixed(1)}%.`,
        severity: "high",
        observedValue: loadPercent,
        expectedRange: "preferably below 90%",
      });
    } else if (loadPercent >= 80) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "POWER-ELEVATED-LOAD",
        explanation: `${asset.name} has elevated loading at ${loadPercent.toFixed(1)}%.`,
        severity: "medium",
        observedValue: loadPercent,
        expectedRange: "preferably below 80%",
      });
    }
  }

  if (
    voltageV !== undefined &&
    ratedVoltageV !== undefined &&
    ratedVoltageV > 0
  ) {
    const deviationPercent = ((voltageV - ratedVoltageV) / ratedVoltageV) * 100;

    if (Math.abs(deviationPercent) > 10) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "POWER-VOLTAGE-CRITICAL",
        explanation: `${asset.name} voltage deviates by ${deviationPercent.toFixed(2)}% from its configured rated voltage.`,
        severity: "critical",
        observedValue: voltageV,
        expectedRange: `within ±10% of ${ratedVoltageV} V`,
      });
    } else if (Math.abs(deviationPercent) > 5) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "POWER-VOLTAGE-WARNING",
        explanation: `${asset.name} voltage deviates by ${deviationPercent.toFixed(2)}% from its configured rated voltage.`,
        severity: "medium",
        observedValue: voltageV,
        expectedRange: `within ±5% of ${ratedVoltageV} V`,
      });
    }
  }

  if (
    frequencyHz !== undefined &&
    asset.status !== "standby" &&
    asset.status !== "stopped"
  ) {
    const deviation = Math.abs(frequencyHz - 50);

    if (deviation > 1) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "POWER-FREQUENCY-CRITICAL",
        explanation: `${asset.name} frequency is ${frequencyHz.toFixed(2)} Hz.`,
        severity: "critical",
        observedValue: frequencyHz,
        expectedRange: "49–51 Hz",
      });
    } else if (deviation > 0.5) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "POWER-FREQUENCY-WARNING",
        explanation: `${asset.name} frequency is ${frequencyHz.toFixed(2)} Hz.`,
        severity: "medium",
        observedValue: frequencyHz,
        expectedRange: "49.5–50.5 Hz",
      });
    }
  }

  if (asset.assetType === "automatic-transfer-switch") {
    const normalSourceId = readString(metadata, "normalSourceId");

    const emergencySourceId = readString(metadata, "emergencySourceId");

    const activeSourceId = readString(metadata, "activeSourceId");

    if (!normalSourceId || !emergencySourceId || !activeSourceId) {
      assessments.push({
        assetId: asset.id,
        name: asset.name,
        issueCode: "ATS-CONFIGURATION-INCOMPLETE",
        explanation: `${asset.name} does not have a complete normal, emergency and active-source configuration.`,
        severity: "high",
        expectedRange:
          "normalSourceId, emergencySourceId and activeSourceId configured",
      });
    }
  }

  if (
    asset.assetType === "generator" &&
    asset.status === "running" &&
    voltageV === 0
  ) {
    assessments.push({
      assetId: asset.id,
      name: asset.name,
      issueCode: "GENERATOR-NO-OUTPUT",
      explanation: `${asset.name} is marked as running but has zero configured output voltage.`,
      severity: "critical",
      observedValue: voltageV,
      expectedRange: "output voltage above zero",
    });
  }

  return assessments;
}

function highestSeverity(assessments: PowerAssetAssessment[]): NexusSeverity {
  const ranking: Record<NexusSeverity, number> = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return assessments.reduce<NexusSeverity>(
    (highest, assessment) =>
      ranking[assessment.severity] > ranking[highest]
        ? assessment.severity
        : highest,
    "info",
  );
}

export const powerOperationsAgent: NexusAgent = {
  agentId: "power-operations-agent",
  name: "Power Operations Agent",
  description:
    "Deterministically evaluates airport electrical assets, loading, voltage, frequency, generator and ATS conditions.",
  supportedTwins: ["power"],
  deterministic: true,
  llmReady: true,

  async run(
    request: NexusAgentRunRequest,
    context: NexusAgentExecutionContext,
  ): Promise<NexusAgentFinding[]> {
    const assets = await context.assetRegistry.list({
      twinType: "power",
    });

    const scopedAssets = request.targetAssetId
      ? assets.filter((asset) => asset.id === request.targetAssetId)
      : assets;

    const assessments = scopedAssets.flatMap(assessPowerAsset);

    const severity = highestSeverity(assessments);

    const criticalAssets = Array.from(
      new Set(
        assessments
          .filter((assessment) => assessment.severity === "critical")
          .map((assessment) => assessment.assetId),
      ),
    );

    const warningAssets = Array.from(
      new Set(
        assessments
          .filter((assessment) =>
            ["medium", "high"].includes(assessment.severity),
          )
          .map((assessment) => assessment.assetId),
      ),
    );

    const recommendedActions = [];

    if (criticalAssets.length > 0) {
      recommendedActions.push({
        actionId: randomUUID(),
        title: "Escalate critical electrical condition",
        description:
          "Verify field measurements, protection status and electrical isolation requirements before any switching action.",
        priority: "critical" as const,
        requiresHumanApproval: true,
        commandAction: "power.condition.escalate",
        parameters: {
          assetIds: criticalAssets,
        },
      });
    }

    if (warningAssets.length > 0) {
      recommendedActions.push({
        actionId: randomUUID(),
        title: "Review electrical loading and quality",
        description:
          "Review loading, voltage, frequency and power-quality trends for the identified assets.",
        priority: "high" as const,
        requiresHumanApproval: false,
        commandAction: "power.assets.inspect",
        parameters: {
          assetIds: warningAssets,
        },
      });
    }

    return [
      {
        findingId: randomUUID(),
        agentId: "power-operations-agent",
        sourceTwin: "power",
        assetId: request.targetAssetId,
        title:
          assessments.length === 0
            ? "Power Twin foundation is within configured limits"
            : "Electrical conditions require operational review",
        explanation:
          `Evaluated ${scopedAssets.length} Power Twin assets and identified ` +
          `${assessments.length} deterministic engineering observations. ` +
          `${criticalAssets.length} assets have critical observations and ` +
          `${warningAssets.length} assets have warning-level observations.`,
        evidence: [
          {
            source: "nexus-power-asset-registry",
            description:
              "Deterministic electrical asset, loading, voltage, frequency, generator and ATS assessment.",
            value: {
              evaluatedAssetCount: scopedAssets.length,
              assessmentCount: assessments.length,
              assessments,
            },
            timestamp: context.now().toISOString(),
          },
        ],
        confidence: 1,
        severity,
        recommendedActions,
        createdAt: context.now().toISOString(),
      },
    ];
  },
};
