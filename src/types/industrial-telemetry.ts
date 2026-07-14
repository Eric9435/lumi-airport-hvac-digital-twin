export type TelemetryQuality =
  "GOOD" | "UNCERTAIN" | "BAD" | "MISSING" | "STALE";

export type CommunicationStatus =
  "online" | "degraded" | "intermittent" | "offline" | "unknown";

export type DeviceHealthStatus =
  "healthy" | "warning" | "fault" | "maintenance" | "offline";

export interface TelemetryMetadata {
  timestamp: string;
  sourceId: string;
  sourceProtocol:
    "csv" | "bacnet" | "modbus" | "mqtt" | "opc-ua" | "api" | "simulation";
  quality: TelemetryQuality;
  communicationStatus: CommunicationStatus;
  lastCommunicationAt: string;
  dataAgeSeconds: number;
  modelVersion?: string;
}

export interface AirportOperationsTelemetry {
  passengerCount: number;
  staffCount: number;
  activeFlights: number;
  activeGates: number;
  arrivalPassengers: number;
  departurePassengers: number;
}

export interface OutdoorWeatherTelemetry {
  dryBulbTemperatureC: number;
  wetBulbTemperatureC: number;
  relativeHumidityPercent: number;
  solarLoadPercent: number;
  atmosphericPressureKpa?: number;
}

export interface BuildingLoadTelemetry {
  lightingLoadKw: number;
  equipmentLoadKw: number;
  ventilationLoadKw: number;
  occupantSensibleLoadKw?: number;
  occupantLatentLoadKw?: number;
  solarHeatGainKw?: number;
  totalCoolingLoadKw: number;
}

export interface ChillerTelemetry {
  equipmentId: string;
  status: DeviceHealthStatus;
  loadPercent: number;
  coolingCapacityKw: number;
  chilledWaterSupplyTemperatureC: number;
  chilledWaterReturnTemperatureC: number;
  chilledWaterFlowM3h: number;
  condenserWaterEnteringTemperatureC: number;
  condenserWaterLeavingTemperatureC: number;
  condenserWaterFlowM3h: number;
  compressorPowerKw: number;
  cop: number;
  runtimeHours: number;
  startCount: number;
  alarmCode: string | null;
}

export interface PumpTelemetry {
  equipmentId: string;
  status: DeviceHealthStatus;
  speedPercent: number;
  flowM3h: number;
  suctionPressureBar: number;
  dischargePressureBar: number;
  differentialPressureBar: number;
  headM: number;
  powerKw: number;
  currentA: number;
  vibrationRmsMmPerSecond: number | null;
  bearingTemperatureC: number | null;
  motorWindingTemperatureC: number | null;
  currentImbalancePercent: number | null;
  alarmCode: string | null;
}

export interface CoolingTowerTelemetry {
  equipmentId: string;
  status: DeviceHealthStatus;
  fanSpeedPercent: number;
  condenserWaterSupplyTemperatureC: number;
  condenserWaterReturnTemperatureC: number;
  ambientWetBulbTemperatureC: number;
  approachC: number;
  rangeC: number;
  waterFlowM3h: number;
  fanPowerKw: number;
  fanVibrationRmsMmPerSecond: number | null;
  fanBearingTemperatureC: number | null;
  alarmCode: string | null;
}

export interface AhuTelemetry {
  equipmentId: string;
  zoneId: string;
  status: DeviceHealthStatus;

  zoneTemperatureC: number;
  zoneSetpointC: number;
  zoneRelativeHumidityPercent: number;

  supplyAirTemperatureC: number;
  returnAirTemperatureC: number;
  supplyAirRelativeHumidityPercent: number | null;
  returnAirRelativeHumidityPercent: number | null;

  supplyAirflowCmh: number;
  coolingValvePercent: number;
  damperPositionPercent: number;
  outdoorAirPercent: number;
  fanSpeedPercent: number;
  fanPowerKw: number;

  filterDifferentialPressurePa: number;
  co2Ppm: number;
  pm25MicrogramsPerM3: number;
  occupancy: number;

  vibrationRmsMmPerSecond: number | null;
  bearingTemperatureC: number | null;
  alarmCode: string | null;
}

export interface IndoorEnvironmentTelemetry {
  zoneId: string;
  roomTemperatureC: number;
  roomRelativeHumidityPercent: number;
  co2Ppm: number;
  pm25MicrogramsPerM3: number;
  occupancy: number;
  comfortIndexPercent: number;
  indoorAirQualityScore: number;
}

export interface EnergyManagementTelemetry {
  hvacPowerKw: number;
  nonHvacPowerKw: number;
  totalBuildingPowerKw: number;

  hvacEnergyKwh: number;
  nonHvacEnergyKwh: number;
  totalBuildingEnergyKwh: number;

  systemCop: number;
  energyEfficiencyScore: number;
  estimatedSavingKwh: number;
  estimatedSavingPercent: number;

  gridCarbonIntensityKgPerKwh: number;
  carbonEmissionsKg: number;
}

export interface PredictiveMaintenanceTelemetry {
  equipmentId: string;
  healthScore: number;
  remainingUsefulLifeDays: number | null;
  failureProbabilityPercent: number;
  predictedFailureMode: string | null;
  recommendedAction: string;
  recommendedCompletionDays: number;
  confidencePercent: number;
}

export interface AiDigitalTwinTelemetry {
  coolingLoadPredictionKw: number;
  coolingLoadForecastHorizonMinutes: number;

  energyForecastKwh: number;
  energyForecastHorizonMinutes: number;

  faultPredictionCount: number;
  highestFaultProbabilityPercent: number;

  maintenanceRecommendationCount: number;

  optimizedChillerCount: number;
  optimizedChwSupplySetpointC: number;
  optimizedAhuSetpointC: number | null;

  estimatedEnergySavingPercent: number;
  forecastConfidencePercent: number;
  modelVersion: string;
}

export interface SystemHealthTelemetry {
  totalSensors: number;
  goodSensors: number;
  uncertainSensors: number;
  badSensors: number;
  missingSensors: number;
  staleSensors: number;

  onlineDevices: number;
  degradedDevices: number;
  offlineDevices: number;

  activeAlarmCount: number;
  criticalAlarmCount: number;

  communicationAvailabilityPercent: number;
  dataCompletenessPercent: number;
  systemHealthScore: number;
  systemHealthStatus: DeviceHealthStatus;
}

export interface IndustrialDigitalTwinSnapshot {
  metadata: TelemetryMetadata;

  airportOperations: AirportOperationsTelemetry;
  outdoorWeather: OutdoorWeatherTelemetry;
  buildingLoad: BuildingLoadTelemetry;

  chillers: ChillerTelemetry[];
  chilledWaterPumps: PumpTelemetry[];
  condenserWaterPumps: PumpTelemetry[];
  coolingTowers: CoolingTowerTelemetry[];
  ahus: AhuTelemetry[];

  indoorEnvironment: IndoorEnvironmentTelemetry[];
  energyManagement: EnergyManagementTelemetry;
  predictiveMaintenance: PredictiveMaintenanceTelemetry[];
  aiDigitalTwin: AiDigitalTwinTelemetry;
  systemHealth: SystemHealthTelemetry;
}
