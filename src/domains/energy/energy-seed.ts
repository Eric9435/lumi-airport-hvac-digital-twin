import type {
  CarbonFactor,
  EnergyBaseline,
  EnergyTariff,
} from "@/domains/energy/energy-contracts";

export const defaultEnergyTariff: EnergyTariff = {
  tariffId: "MM-HVAC-TARIFF-2026",
  name: "Configured LUMI Electricity Tariff",
  currency: "MMK",
  energyRatePerKwh: 900,
  validFrom: "2026-01-01T00:00:00.000Z",
};

export const defaultCarbonFactor: CarbonFactor = {
  factorId: "LUMI-CARBON-FACTOR-2026",
  name: "Configured LUMI Carbon Factor",
  kgCo2ePerKwh: 0.45,
  source: "LUMI simulation configuration",
  validFrom: "2026-01-01T00:00:00.000Z",
  verified: false,
};

export const hvacSimulationBaseline: EnergyBaseline = {
  baselineId: "LUMI-HVAC-24H-BASELINE",
  siteId: "YIA",
  domain: "hvac",
  periodStart: "2026-07-14T00:00:00.000Z",
  periodEnd: "2026-07-15T00:00:00.000Z",
  baselineEnergyKwh: 2038.29,
  method: "configured",
  verified: false,
  notes:
    "Model-derived baseline used for simulation comparison; not a verified operational baseline.",
};
