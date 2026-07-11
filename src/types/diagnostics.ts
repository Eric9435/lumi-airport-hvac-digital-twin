import type { AlarmLevel } from "@/types/hvac";

export type DiagnosticCategory =
  | "performance"
  | "energy"
  | "comfort"
  | "air-quality"
  | "maintenance"
  | "control"
  | "safety";

export type RecommendationStatus =
  "new" | "reviewed" | "approved" | "rejected" | "executed";

export type MaintenancePriority = "low" | "medium" | "high" | "critical";

export type WorkOrderStatus =
  "open" | "assigned" | "in-progress" | "completed" | "cancelled";

export interface DiagnosticFinding {
  findingId: string;
  detectedAt: string;
  equipmentId: string;
  equipmentName: string;
  zoneId: string | null;
  category: DiagnosticCategory;
  severity: AlarmLevel;
  title: string;
  summary: string;
  probableCauses: string[];
  evidence: string[];
  recommendedActions: string[];
  confidencePercent: number;
}

export interface LumiRecommendation {
  recommendationId: string;
  createdAt: string;
  equipmentId: string | null;
  zoneId: string | null;
  category: DiagnosticCategory;
  title: string;
  analysisSummary: string;
  recommendedAction: string;
  expectedImpact: string;
  estimatedEnergySavingPercent: number | null;
  comfortImpact: "improve" | "neutral" | "reduce";
  riskLevel: "low" | "medium" | "high" | "critical";
  confidencePercent: number;
  approvalRequired: boolean;
  status: RecommendationStatus;
}

export interface MaintenanceWorkOrder {
  workOrderId: string;
  createdAt: string;
  equipmentId: string;
  equipmentName: string;
  zoneId: string | null;
  source: "lumi" | "alarm" | "operator" | "scheduled";
  sourceReferenceId: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  assignedTo: string | null;
  plannedStart: string | null;
  actualStart: string | null;
  completedAt: string | null;
  status: WorkOrderStatus;
  inspectionResult: string;
  correctiveAction: string;
  estimatedCost: number | null;
  actualCost: number | null;
  remarks: string;
}

export interface PlantDiagnosticReport {
  generatedAt: string;
  overallHealthScore: number;
  operatingStatus: "healthy" | "attention-required" | "degraded" | "critical";
  findings: DiagnosticFinding[];
  recommendations: LumiRecommendation[];
}
