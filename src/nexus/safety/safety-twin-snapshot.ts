import type { NexusAsset, NexusEvent, NexusSeverity } from "@/nexus/contracts";
import { nexusEventBus } from "@/nexus/events";
import { initializeNexusAssets, nexusAssetRegistry } from "@/nexus/registry";

export type SafetyReadinessStatus =
  "ready" | "attention" | "degraded" | "critical";

export interface SafetyAssetSummary {
  assetId: string;
  assetName: string;
  twinType: string;
  assetType: string;
  status: string;
  criticality: string;
  healthScore: number | null;
  safetyPriority: "critical" | "high" | "medium" | "low";
  reason: string;
}

export interface SafetyEventSummary {
  eventId: string;
  eventType: string;
  sourceTwin: string;
  assetId?: string;
  severity: NexusSeverity;
  timestamp: string;
  requiresHumanApproval: boolean;
  description: string;
}

export interface SafetyTwinSnapshot {
  generatedAt: string;
  simulationOnly: true;
  readinessStatus: SafetyReadinessStatus;
  readinessScore: number;
  totalAssets: number;
  criticalAssets: number;
  unavailableCriticalAssets: number;
  recentEventCount: number;
  criticalEventCount: number;
  approvalRequiredEventCount: number;
  alarmEventCount: number;
  assets: SafetyAssetSummary[];
  events: SafetyEventSummary[];
  controls: {
    autonomousEmergencyControl: false;
    physicalShutdownEnabled: false;
    humanApprovalRequired: true;
    fieldVerificationRequired: true;
  };
}

const unavailableStatuses = new Set(["fault", "offline", "unavailable"]);

const warningStatuses = new Set(["warning", "maintenance"]);

function severityRank(severity: NexusSeverity): number {
  return {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[severity];
}

function assetSafetyPriority(
  asset: NexusAsset,
): SafetyAssetSummary["safetyPriority"] {
  if (
    unavailableStatuses.has(asset.status) &&
    asset.criticality === "critical"
  ) {
    return "critical";
  }

  if (
    unavailableStatuses.has(asset.status) ||
    asset.criticality === "critical"
  ) {
    return "high";
  }

  if (warningStatuses.has(asset.status) || asset.criticality === "high") {
    return "medium";
  }

  return "low";
}

function assetSafetyReason(asset: NexusAsset): string {
  if (
    unavailableStatuses.has(asset.status) &&
    asset.criticality === "critical"
  ) {
    return "Critical infrastructure asset is unavailable.";
  }

  if (unavailableStatuses.has(asset.status)) {
    return `Asset is currently ${asset.status}.`;
  }

  if (asset.status === "warning") {
    return "Asset has an active warning condition.";
  }

  if (asset.status === "maintenance") {
    return "Asset is under maintenance control.";
  }

  if (asset.criticality === "critical") {
    return "Critical infrastructure asset requires continuous monitoring.";
  }

  return "No immediate safety condition detected.";
}

function eventDescription(event: NexusEvent): string {
  const payload = event.payload;

  const message =
    typeof payload.message === "string"
      ? payload.message
      : typeof payload.alarmMessage === "string"
        ? payload.alarmMessage
        : typeof payload.description === "string"
          ? payload.description
          : null;

  return message ?? `${event.eventType} event from ${event.sourceTwin} twin.`;
}

function calculateReadinessScore(
  totalAssets: number,
  unavailableCriticalAssets: number,
  criticalEventCount: number,
  approvalRequiredEventCount: number,
): number {
  if (totalAssets === 0) {
    return 0;
  }

  const unavailablePenalty = unavailableCriticalAssets * 25;

  const criticalEventPenalty = Math.min(criticalEventCount * 10, 30);

  const approvalPenalty = Math.min(approvalRequiredEventCount * 3, 15);

  return Math.max(
    0,
    Math.min(
      100,
      100 - unavailablePenalty - criticalEventPenalty - approvalPenalty,
    ),
  );
}

function determineReadinessStatus(score: number): SafetyReadinessStatus {
  if (score >= 90) {
    return "ready";
  }

  if (score >= 75) {
    return "attention";
  }

  if (score >= 50) {
    return "degraded";
  }

  return "critical";
}

export async function createSafetyTwinSnapshot(): Promise<SafetyTwinSnapshot> {
  await initializeNexusAssets();

  const assets = await nexusAssetRegistry.list();

  const recentEvents = nexusEventBus
    .getHistory({}, 200)
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() -
        new Date(left.timestamp).getTime(),
    );

  const safetyAssets = assets
    .map((asset) => ({
      assetId: asset.id,
      assetName: asset.name,
      twinType: asset.twinType,
      assetType: asset.assetType,
      status: asset.status,
      criticality: asset.criticality,
      healthScore:
        typeof asset.healthScore === "number" ? asset.healthScore : null,
      safetyPriority: assetSafetyPriority(asset),
      reason: assetSafetyReason(asset),
    }))
    .sort((left, right) => {
      const priorities = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      return priorities[right.safetyPriority] - priorities[left.safetyPriority];
    });

  const safetyEvents = recentEvents
    .filter(
      (event) =>
        severityRank(event.severity) >= severityRank("medium") ||
        event.requiresHumanApproval ||
        event.eventType.includes("alarm") ||
        event.eventType.includes("fault") ||
        event.eventType.includes("emergency"),
    )
    .slice(0, 50)
    .map((event) => ({
      eventId: event.eventId,
      eventType: event.eventType,
      sourceTwin: event.sourceTwin,
      assetId: event.assetId,
      severity: event.severity,
      timestamp: event.timestamp,
      requiresHumanApproval: event.requiresHumanApproval,
      description: eventDescription(event),
    }));

  const criticalAssets = assets.filter(
    (asset) => asset.criticality === "critical",
  );

  const unavailableCriticalAssets = criticalAssets.filter((asset) =>
    unavailableStatuses.has(asset.status),
  );

  const criticalEventCount = safetyEvents.filter(
    (event) => event.severity === "critical",
  ).length;

  const approvalRequiredEventCount = safetyEvents.filter(
    (event) => event.requiresHumanApproval,
  ).length;

  const alarmEventCount = safetyEvents.filter((event) =>
    event.eventType.includes("alarm"),
  ).length;

  const readinessScore = calculateReadinessScore(
    assets.length,
    unavailableCriticalAssets.length,
    criticalEventCount,
    approvalRequiredEventCount,
  );

  return {
    generatedAt: new Date().toISOString(),
    simulationOnly: true,
    readinessStatus: determineReadinessStatus(readinessScore),
    readinessScore,
    totalAssets: assets.length,
    criticalAssets: criticalAssets.length,
    unavailableCriticalAssets: unavailableCriticalAssets.length,
    recentEventCount: safetyEvents.length,
    criticalEventCount,
    approvalRequiredEventCount,
    alarmEventCount,
    assets: safetyAssets,
    events: safetyEvents,
    controls: {
      autonomousEmergencyControl: false,
      physicalShutdownEnabled: false,
      humanApprovalRequired: true,
      fieldVerificationRequired: true,
    },
  };
}
