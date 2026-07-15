import type { NexusTwinType } from "@/nexus/contracts";

export type NexusDomainMaturity = "operational" | "foundation" | "planned";

export interface NexusDomainDescriptor {
  twinType: NexusTwinType;
  name: string;
  description: string;
  maturity: NexusDomainMaturity;
  enabled: boolean;
  simulationOnly: boolean;
  capabilities: string[];
}

const domains: NexusDomainDescriptor[] = [
  {
    twinType: "hvac",
    name: "LUMI HVAC Twin",
    description:
      "Operational Airport HVAC Digital Twin with simulation, controls, diagnostics and energy analytics.",
    maturity: "operational",
    enabled: true,
    simulationOnly: true,
    capabilities: [
      "plant-simulation",
      "equipment-control",
      "energy-analytics",
      "alarms",
      "diagnostics",
      "predictive-maintenance",
    ],
  },
  {
    twinType: "power",
    name: "LUMI Power Twin",
    description:
      "Electrical distribution, transformer, generator, ATS and power-quality foundation.",
    maturity: "foundation",
    enabled: true,
    simulationOnly: true,
    capabilities: ["asset-model", "power-quality-contracts", "seed-simulation"],
  },
  {
    twinType: "energy",
    name: "LUMI Energy Twin",
    description:
      "Airport-wide energy, tariff, baseline and carbon-intelligence foundation.",
    maturity: "foundation",
    enabled: true,
    simulationOnly: true,
    capabilities: [
      "energy-baselines",
      "tariff-model",
      "carbon-factor",
      "performance-calculation",
    ],
  },
  {
    twinType: "maintenance",
    name: "LUMI Maintenance Twin",
    description:
      "Asset maintenance, work-order, failure-mode and cost-intelligence foundation.",
    maturity: "foundation",
    enabled: true,
    simulationOnly: true,
    capabilities: [
      "work-order-contracts",
      "failure-modes",
      "maintenance-cost",
      "mtbf",
      "mttr",
    ],
  },
  {
    twinType: "safety",
    name: "LUMI Safety Twin",
    description:
      "Future airport safety, emergency-response and resilience domain.",
    maturity: "planned",
    enabled: false,
    simulationOnly: true,
    capabilities: [],
  },
  {
    twinType: "passenger-flow",
    name: "LUMI Passenger Flow Twin",
    description:
      "Future passenger movement, congestion and terminal-demand domain.",
    maturity: "planned",
    enabled: false,
    simulationOnly: true,
    capabilities: [],
  },
  {
    twinType: "flight-operations",
    name: "LUMI Flight Operations Twin",
    description:
      "Future flight schedule, disruption and infrastructure-demand domain.",
    maturity: "planned",
    enabled: false,
    simulationOnly: true,
    capabilities: [],
  },
];

export function listNexusDomains(): NexusDomainDescriptor[] {
  return structuredClone(domains);
}

export function getNexusDomain(
  twinType: NexusTwinType,
): NexusDomainDescriptor | null {
  const domain = domains.find((candidate) => candidate.twinType === twinType);

  return domain ? structuredClone(domain) : null;
}
