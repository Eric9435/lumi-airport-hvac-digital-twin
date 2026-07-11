export type AssetHealthStatus =
  "excellent" | "good" | "attention-required" | "degraded" | "critical";

export type MaintenanceRisk = "low" | "medium" | "high" | "critical";

export type MaintenanceActionType =
  "inspect" | "clean" | "calibrate" | "replace" | "monitor" | "overhaul";

export interface EquipmentHealthMetric {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  healthScore: number;
  healthStatus: AssetHealthStatus;
  riskLevel: MaintenanceRisk;
  remainingUsefulLifeDays: number | null;
  runtimeHours: number;
  availabilityPercent: number;
  efficiencyScore: number;
  alarmPenalty: number;
  runtimePenalty: number;
  performancePenalty: number;
  primaryIssue: string | null;
  recommendedAction: string;
}

export interface PredictiveMaintenanceItem {
  predictionId: string;
  equipmentId: string;
  equipmentName: string;
  riskLevel: MaintenanceRisk;
  actionType: MaintenanceActionType;
  predictedIssue: string;
  probabilityPercent: number;
  remainingUsefulLifeDays: number | null;
  recommendedCompletionDays: number;
  supportingEvidence: string[];
  recommendedAction: string;
  operationalImpact: string;
}

export interface ReliabilityMetrics {
  totalAssets: number;
  availableAssets: number;
  unavailableAssets: number;
  availabilityPercent: number;
  estimatedMtbfHours: number;
  estimatedMttrHours: number;
  alarmRatePerAsset: number;
  maintenanceRiskAssets: number;
}

export interface ExecutiveKpiSummary {
  generatedAt: string;
  plantPerformanceScore: number;
  assetPerformanceIndex: number;
  energyEfficiencyScore: number;
  reliabilityScore: number;
  comfortScore: number;
  indoorAirQualityScore: number;
  sustainabilityScore: number;
  averageChillerCop: number;
  runningChillers: number;
  activeAhus: number;
  totalPlantPowerKw: number;
  totalEnergyKwh: number;
  expectedPassengers: number;
  activeAlarmCount: number;
  criticalAssetCount: number;
  warningAssetCount: number;
  predictedMaintenanceCount: number;
  estimatedEnergySavingPercent: number;
  estimatedCarbonKg: number;
  reliability: ReliabilityMetrics;
  equipmentHealth: EquipmentHealthMetric[];
  predictiveMaintenance: PredictiveMaintenanceItem[];
  executiveSummary: string;
  priorityActions: string[];
}
