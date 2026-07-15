import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve(process.cwd(), "public/data/nexus-24h");

const START_TIME = new Date("2026-07-15T00:00:00.000Z");

const INTERVAL_MINUTES = 10;
const SNAPSHOT_COUNT = 144;

fs.mkdirSync(OUTPUT_DIR, {
  recursive: true,
});

function round(value, digits = 2) {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function timestampAt(index) {
  return new Date(
    START_TIME.getTime() + index * INTERVAL_MINUTES * 60 * 1000,
  ).toISOString();
}

function hourAt(index) {
  return (index * INTERVAL_MINUTES) / 60;
}

function daylightFactor(hour) {
  if (hour < 6 || hour > 18) {
    return 0;
  }

  return Math.sin(((hour - 6) / 12) * Math.PI);
}

function morningPeak(hour) {
  return Math.exp(-Math.pow((hour - 8.5) / 2.2, 2));
}

function eveningPeak(hour) {
  return Math.exp(-Math.pow((hour - 18.5) / 2.5, 2));
}

function operationalDemand(hour) {
  const daytime = hour >= 5.5 && hour <= 23 ? 0.42 : 0.2;

  return clamp(
    daytime + morningPeak(hour) * 0.35 + eveningPeak(hour) * 0.42,
    0.18,
    1,
  );
}

function seededNoise(index, seed = 1) {
  const value = Math.sin(index * 12.9898 + seed * 78.233);

  return value - Math.floor(value);
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function writeCsv(filename, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(","),
    ),
  ];

  const target = path.join(OUTPUT_DIR, filename);

  fs.writeFileSync(target, `${lines.join("\n")}\n`, "utf8");

  return {
    filename,
    rowCount: rows.length,
    columnCount: headers.length,
    firstTimestamp: rows[0]?.timestamp ?? "",
    lastTimestamp: rows.at(-1)?.timestamp ?? "",
  };
}

const summaries = [];

/* ==========================================================
 * 1. POWER DISTRIBUTION
 * ========================================================== */

const powerAssets = [
  {
    assetId: "TR-01",
    equipmentType: "transformer",
    ratedKva: 1600,
    baseLoadKw: 780,
  },
  {
    assetId: "TR-02",
    equipmentType: "transformer",
    ratedKva: 1600,
    baseLoadKw: 720,
  },
  {
    assetId: "TR-03",
    equipmentType: "transformer",
    ratedKva: 1250,
    baseLoadKw: 540,
  },
  {
    assetId: "TR-04",
    equipmentType: "transformer",
    ratedKva: 1250,
    baseLoadKw: 500,
  },
  {
    assetId: "LV-MSB-01",
    equipmentType: "lv_panel",
    ratedKva: 2000,
    baseLoadKw: 900,
  },
  {
    assetId: "LV-MSB-02",
    equipmentType: "lv_panel",
    ratedKva: 1600,
    baseLoadKw: 680,
  },
  {
    assetId: "HVAC-MCC-01",
    equipmentType: "mcc",
    ratedKva: 1400,
    baseLoadKw: 620,
  },
];

const powerRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const demand = operationalDemand(hour);

  powerAssets.forEach((asset, assetIndex) => {
    const noise = (seededNoise(index, assetIndex + 1) - 0.5) * 0.08;

    const activePowerKw = round(
      asset.baseLoadKw * (0.35 + demand * 0.72 + noise),
    );

    const powerFactor = round(
      clamp(
        0.94 + demand * 0.045 - seededNoise(index, assetIndex + 11) * 0.012,
        0.9,
        0.99,
      ),
      3,
    );

    const apparentPowerKva = round(activePowerKw / powerFactor);

    const reactivePowerKvar = round(
      Math.sqrt(Math.max(apparentPowerKva ** 2 - activePowerKw ** 2, 0)),
    );

    const phaseCurrent = (apparentPowerKva * 1000) / (Math.sqrt(3) * 400);

    const loadPercent = round(
      clamp((apparentPowerKva / asset.ratedKva) * 100, 0, 110),
    );

    const alarmCode = loadPercent >= 95 ? "HIGH_LOAD_WARNING" : "";

    powerRows.push({
      timestamp,
      asset_id: asset.assetId,
      equipment_type: asset.equipmentType,
      terminal_id: "T1",
      zone_id: "ELECTRICAL-PLANT",
      status: alarmCode === "" ? "running" : "warning",
      breaker_state: "closed",
      primary_voltage_v:
        asset.equipmentType === "transformer"
          ? round(11000 + (seededNoise(index, assetIndex + 20) - 0.5) * 80)
          : "",
      secondary_voltage_v: round(
        400 + (seededNoise(index, assetIndex + 30) - 0.5) * 6,
      ),
      current_l1_a: round(phaseCurrent * 0.99),
      current_l2_a: round(phaseCurrent * 1.01),
      current_l3_a: round(
        phaseCurrent * (0.985 + seededNoise(index, assetIndex + 40) * 0.025),
      ),
      neutral_current_a: round(phaseCurrent * 0.045),
      active_power_kw: activePowerKw,
      reactive_power_kvar: reactivePowerKvar,
      apparent_power_kva: apparentPowerKva,
      power_factor: powerFactor,
      frequency_hz: round(
        50 + (seededNoise(index, assetIndex + 50) - 0.5) * 0.08,
        3,
      ),
      load_percent: loadPercent,
      winding_temp_c: round(38 + loadPercent * 0.55),
      oil_temp_c:
        asset.equipmentType === "transformer"
          ? round(34 + loadPercent * 0.42)
          : "",
      thd_voltage_percent: round(1.6 + demand * 1.2),
      thd_current_percent: round(3.8 + demand * 3.7),
      voltage_unbalance_percent: round(
        0.3 + seededNoise(index, assetIndex + 60) * 0.8,
      ),
      current_unbalance_percent: round(
        0.7 + seededNoise(index, assetIndex + 70) * 1.5,
      ),
      alarm_code: alarmCode,
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-power-distribution-24h-10min.csv",
    [
      "timestamp",
      "asset_id",
      "equipment_type",
      "terminal_id",
      "zone_id",
      "status",
      "breaker_state",
      "primary_voltage_v",
      "secondary_voltage_v",
      "current_l1_a",
      "current_l2_a",
      "current_l3_a",
      "neutral_current_a",
      "active_power_kw",
      "reactive_power_kvar",
      "apparent_power_kva",
      "power_factor",
      "frequency_hz",
      "load_percent",
      "winding_temp_c",
      "oil_temp_c",
      "thd_voltage_percent",
      "thd_current_percent",
      "voltage_unbalance_percent",
      "current_unbalance_percent",
      "alarm_code",
      "quality",
      "source_mode",
    ],
    powerRows,
  ),
);

/* ==========================================================
 * 2. EMERGENCY POWER
 * ========================================================== */

const resilienceAssets = [
  {
    id: "GEN-01",
    type: "generator",
  },
  {
    id: "GEN-02",
    type: "generator",
  },
  {
    id: "ATS-01",
    type: "ats",
  },
  {
    id: "UPS-01",
    type: "ups",
  },
  {
    id: "UPS-02",
    type: "ups",
  },
];

const resilienceRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const demand = operationalDemand(hour);

  resilienceAssets.forEach((asset, assetIndex) => {
    const generatorTest =
      asset.type === "generator" &&
      hour >= 10 &&
      hour < 10.5 &&
      asset.id === "GEN-01";

    const isGenerator = asset.type === "generator";

    const isUps = asset.type === "ups";
    const isAts = asset.type === "ats";

    const status = generatorTest
      ? "running"
      : isGenerator
        ? "standby"
        : "running";

    resilienceRows.push({
      timestamp,
      asset_id: asset.id,
      equipment_type: asset.type,
      terminal_id: "T1",
      zone_id: "EMERGENCY-POWER",
      status,
      operating_mode: isGenerator || isAts ? "auto" : "online",
      voltage_v: isGenerator ? (generatorTest ? 400 : 0) : 400,
      current_a: isGenerator
        ? generatorTest
          ? 185
          : 0
        : isUps
          ? round(90 + demand * 120 + seededNoise(index, assetIndex + 100) * 12)
          : "",
      frequency_hz: isGenerator ? 50 : isUps ? 50 : "",
      active_power_kw: isGenerator
        ? generatorTest
          ? 115
          : 0
        : isUps
          ? round(55 + demand * 75)
          : "",
      power_factor: isGenerator || isUps ? 0.98 : "",
      load_percent: isGenerator
        ? generatorTest
          ? 28
          : 0
        : isUps
          ? round(28 + demand * 35)
          : "",
      fuel_level_percent: isGenerator
        ? round(88 - index * 0.004 - (generatorTest ? 0.35 : 0))
        : "",
      coolant_temp_c: isGenerator
        ? generatorTest
          ? 73
          : round(29 + daylightFactor(hour) * 4)
        : "",
      oil_pressure_bar: isGenerator ? (generatorTest ? 4.6 : 0) : "",
      starter_battery_voltage_v: isGenerator ? 26.2 : "",
      battery_charge_percent: isUps
        ? round(99 - seededNoise(index, assetIndex + 110) * 1.2)
        : "",
      battery_runtime_min: isUps ? round(68 - demand * 24) : "",
      bypass_status: isUps ? "false" : "",
      normal_source_available: isAts ? "true" : "",
      emergency_source_available: isAts ? "true" : "",
      ats_position: isAts ? "normal" : "",
      alarm_code: "",
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-emergency-power-24h-10min.csv",
    [
      "timestamp",
      "asset_id",
      "equipment_type",
      "terminal_id",
      "zone_id",
      "status",
      "operating_mode",
      "voltage_v",
      "current_a",
      "frequency_hz",
      "active_power_kw",
      "power_factor",
      "load_percent",
      "fuel_level_percent",
      "coolant_temp_c",
      "oil_pressure_bar",
      "starter_battery_voltage_v",
      "battery_charge_percent",
      "battery_runtime_min",
      "bypass_status",
      "normal_source_available",
      "emergency_source_available",
      "ats_position",
      "alarm_code",
      "quality",
      "source_mode",
    ],
    resilienceRows,
  ),
);

/* ==========================================================
 * 3. ENERGY AND UTILITIES
 * ========================================================== */

const utilityMeters = [
  {
    id: "EM-T1-MAIN",
    type: "electricity",
    base: 1480,
  },
  {
    id: "EM-HVAC-01",
    type: "electricity",
    base: 920,
  },
  {
    id: "BTU-CHW-01",
    type: "thermal",
    base: 2650,
  },
  {
    id: "WM-CT-01",
    type: "water",
    base: 18,
  },
  {
    id: "WM-DOMESTIC-01",
    type: "water",
    base: 9,
  },
  {
    id: "SOLAR-PV-01",
    type: "solar",
    base: 420,
  },
  {
    id: "BESS-01",
    type: "battery",
    base: 250,
  },
  {
    id: "GAS-GEN-01",
    type: "gas",
    base: 0,
  },
];

const cumulative = new Map();
const utilityRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const demand = operationalDemand(hour);
  const daylight = daylightFactor(hour);

  utilityMeters.forEach((meter, meterIndex) => {
    let activePowerKw = "";
    let thermalPowerKw = "";
    let waterFlowM3h = "";
    let solarPowerKw = "";
    let batteryPowerKw = "";
    let gasFlowM3h = "";

    if (meter.type === "electricity") {
      activePowerKw = round(meter.base * (0.32 + demand * 0.75));
    }

    if (meter.type === "thermal") {
      thermalPowerKw = round(meter.base * (0.28 + demand * 0.8));
    }

    if (meter.type === "water") {
      waterFlowM3h = round(meter.base * (0.25 + demand * 0.9));
    }

    if (meter.type === "solar") {
      solarPowerKw = round(meter.base * daylight);
    }

    if (meter.type === "battery") {
      batteryPowerKw =
        hour >= 18 && hour <= 21
          ? round(-120 * demand)
          : hour >= 10 && hour <= 15
            ? round(75 * daylight)
            : 0;
    }

    if (meter.type === "gas" && hour >= 10 && hour < 10.5) {
      gasFlowM3h = 28;
    }

    const instantaneous =
      Number(activePowerKw || 0) +
      Number(thermalPowerKw || 0) +
      Number(solarPowerKw || 0) +
      Math.abs(Number(batteryPowerKw || 0)) +
      Number(waterFlowM3h || 0) +
      Number(gasFlowM3h || 0);

    const previous = cumulative.get(meter.id) ?? 100000 + meterIndex * 25000;

    const nextCumulative = round(
      previous + instantaneous * (INTERVAL_MINUTES / 60),
      3,
    );

    cumulative.set(meter.id, nextCumulative);

    const tariffCode =
      hour >= 17 && hour < 22
        ? "PEAK"
        : hour >= 7 && hour < 17
          ? "STANDARD"
          : "OFF_PEAK";

    const tariff =
      tariffCode === "PEAK" ? 1100 : tariffCode === "STANDARD" ? 900 : 700;

    utilityRows.push({
      timestamp,
      meter_id: meter.id,
      utility_type: meter.type,
      terminal_id: "T1",
      zone_id:
        meter.type === "thermal"
          ? "CENTRAL-PLANT"
          : meter.type === "water"
            ? "UTILITY"
            : "MAIN",
      active_power_kw: activePowerKw,
      active_energy_kwh:
        meter.type === "electricity" ||
        meter.type === "solar" ||
        meter.type === "battery"
          ? nextCumulative
          : "",
      thermal_power_kw: thermalPowerKw,
      thermal_energy_kwh: meter.type === "thermal" ? nextCumulative : "",
      water_flow_m3h: waterFlowM3h,
      water_total_m3: meter.type === "water" ? nextCumulative : "",
      solar_power_kw: solarPowerKw,
      solar_energy_kwh: meter.type === "solar" ? nextCumulative : "",
      battery_soc_percent:
        meter.type === "battery"
          ? round(clamp(74 + daylight * 12 - eveningPeak(hour) * 18, 25, 96))
          : "",
      charge_discharge_power_kw: batteryPowerKw,
      gas_flow_m3h: gasFlowM3h,
      gas_total_m3: meter.type === "gas" ? nextCumulative : "",
      maximum_demand_kw:
        meter.type === "electricity" ? round(Number(activePowerKw) * 1.08) : "",
      tariff_code: meter.type === "electricity" ? tariffCode : "",
      tariff_mmk_per_kwh: meter.type === "electricity" ? tariff : "",
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-energy-utilities-24h-10min.csv",
    [
      "timestamp",
      "meter_id",
      "utility_type",
      "terminal_id",
      "zone_id",
      "active_power_kw",
      "active_energy_kwh",
      "thermal_power_kw",
      "thermal_energy_kwh",
      "water_flow_m3h",
      "water_total_m3",
      "solar_power_kw",
      "solar_energy_kwh",
      "battery_soc_percent",
      "charge_discharge_power_kw",
      "gas_flow_m3h",
      "gas_total_m3",
      "maximum_demand_kw",
      "tariff_code",
      "tariff_mmk_per_kwh",
      "quality",
      "source_mode",
    ],
    utilityRows,
  ),
);

/* ==========================================================
 * 4. SAFETY SYSTEMS
 * ========================================================== */

const safetyPoints = [
  ["SD-T1-001", "fire_alarm", "smoke_detector", "DEPARTURE-HALL"],
  ["SD-T1-002", "fire_alarm", "smoke_detector", "ARRIVAL-HALL"],
  ["HD-PLANT-01", "fire_alarm", "heat_detector", "CENTRAL-PLANT"],
  ["MCP-T1-01", "fire_alarm", "manual_call_point", "DEPARTURE-HALL"],
  ["FP-01", "fire_pump", "fire_pump_status", "FIRE-PUMP-ROOM"],
  ["FD-AHU-01", "smoke_control", "fire_damper", "DEPARTURE-HALL"],
  ["SPF-01", "smoke_control", "stair_pressurization", "STAIR-A"],
  ["CO-PLANT-01", "gas_detection", "carbon_monoxide", "CENTRAL-PLANT"],
  ["REF-PLANT-01", "gas_detection", "refrigerant", "CENTRAL-PLANT"],
  ["LD-PLANT-01", "leak_detection", "water_leak", "CENTRAL-PLANT"],
  ["EL-T1-01", "emergency_lighting", "circuit_status", "DEPARTURE-HALL"],
  ["EXIT-T1-01", "evacuation", "exit_door", "EXIT-A"],
];

const safetyRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);

  safetyPoints.forEach((point, pointIndex) => {
    const [assetId, system, eventType, zone] = point;

    const leakWarning = assetId === "LD-PLANT-01" && index >= 70 && index <= 73;

    const refrigerantWarning =
      assetId === "REF-PLANT-01" && index >= 109 && index <= 111;

    const smokeWarning = assetId === "SD-T1-002" && index === 82;

    const active = leakWarning || refrigerantWarning || smokeWarning;

    const severity =
      refrigerantWarning || smokeWarning
        ? "high"
        : leakWarning
          ? "medium"
          : "info";

    const alarmCode = leakWarning
      ? "WATER_LEAK_WARNING"
      : refrigerantWarning
        ? "REFRIGERANT_HIGH"
        : smokeWarning
          ? "SMOKE_PREALARM"
          : "";

    const sensorValue =
      eventType === "refrigerant"
        ? refrigerantWarning
          ? 320
          : round(14 + seededNoise(index, pointIndex + 200) * 5)
        : eventType === "carbon_monoxide"
          ? round(4 + seededNoise(index, pointIndex + 210) * 4)
          : active
            ? 1
            : 0;

    safetyRows.push({
      timestamp,
      event_id: `SAFE-${String(index + 1).padStart(3, "0")}-${String(pointIndex + 1).padStart(2, "0")}`,
      asset_id: assetId,
      safety_system: system,
      event_type: eventType,
      terminal_id: "T1",
      zone_id: zone,
      status: active ? "warning" : "normal",
      severity,
      sensor_value: sensorValue,
      unit:
        eventType === "refrigerant" || eventType === "carbon_monoxide"
          ? "ppm"
          : "boolean",
      alarm_code: alarmCode,
      requires_human_approval: active ? "true" : "false",
      field_verification_required: active ? "true" : "false",
      acknowledged: "false",
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-safety-systems-24h-10min.csv",
    [
      "timestamp",
      "event_id",
      "asset_id",
      "safety_system",
      "event_type",
      "terminal_id",
      "zone_id",
      "status",
      "severity",
      "sensor_value",
      "unit",
      "alarm_code",
      "requires_human_approval",
      "field_verification_required",
      "acknowledged",
      "quality",
      "source_mode",
    ],
    safetyRows,
  ),
);

/* ==========================================================
 * 5. PASSENGER FLOW
 * ========================================================== */

const passengerZones = [
  ["DEPARTURE-HALL", "Departure Hall", 2400, 1.15],
  ["ARRIVAL-HALL", "Arrival Hall", 1900, 0.95],
  ["CHECKIN-A", "Check-in Zone A", 900, 1.05],
  ["CHECKIN-B", "Check-in Zone B", 900, 0.88],
  ["SECURITY-01", "Security Checkpoint", 700, 0.82],
  ["IMMIGRATION-01", "Immigration Hall", 850, 0.78],
  ["GATE-AREA-A", "Gate Area A", 1100, 0.92],
  ["BAGGAGE-CLAIM", "Baggage Claim", 900, 0.72],
];

const passengerRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const demand = operationalDemand(hour);

  passengerZones.forEach((zone, zoneIndex) => {
    const [zoneId, zoneName, capacity, factor] = zone;

    const occupancy = Math.round(
      clamp(
        Number(capacity) *
          (0.12 +
            demand * Number(factor) * 0.72 +
            (seededNoise(index, zoneIndex + 300) - 0.5) * 0.08),
        25,
        Number(capacity) * 0.98,
      ),
    );

    const occupancyPercent = round((occupancy / Number(capacity)) * 100);

    const entering = Math.round(4 + demand * Number(factor) * 34);

    const leaving = Math.round(3 + demand * Number(factor) * 29);

    const queueLength =
      String(zoneId).includes("SECURITY") ||
      String(zoneId).includes("IMMIGRATION") ||
      String(zoneId).includes("CHECKIN")
        ? Math.round(occupancyPercent * 1.35)
        : Math.round(occupancyPercent * 0.3);

    const activeCounters = String(zoneId).includes("CHECKIN")
      ? Math.max(4, Math.round(5 + demand * 13))
      : String(zoneId).includes("SECURITY") ||
          String(zoneId).includes("IMMIGRATION")
        ? Math.max(3, Math.round(3 + demand * 7))
        : "";

    const flowLevel =
      occupancyPercent >= 90
        ? "critical"
        : occupancyPercent >= 75
          ? "high"
          : occupancyPercent >= 55
            ? "elevated"
            : "normal";

    passengerRows.push({
      timestamp,
      terminal_id: "T1",
      zone_id: zoneId,
      zone_name: zoneName,
      passenger_count: occupancy,
      capacity,
      occupancy_percent: occupancyPercent,
      people_entering_per_min: entering,
      people_leaving_per_min: leaving,
      arrival_rate_per_hour: entering * 60,
      departure_rate_per_hour: leaving * 60,
      queue_length: queueLength,
      processing_rate_per_min: round(8 + demand * Number(factor) * 18),
      estimated_wait_time_min: round(
        queueLength / Math.max(1, 8 + demand * Number(factor) * 18),
      ),
      average_dwell_time_min: round(22 + demand * Number(factor) * 34),
      active_service_counters: activeCounters,
      flow_level: flowLevel,
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-passenger-flow-24h-10min.csv",
    [
      "timestamp",
      "terminal_id",
      "zone_id",
      "zone_name",
      "passenger_count",
      "capacity",
      "occupancy_percent",
      "people_entering_per_min",
      "people_leaving_per_min",
      "arrival_rate_per_hour",
      "departure_rate_per_hour",
      "queue_length",
      "processing_rate_per_min",
      "estimated_wait_time_min",
      "average_dwell_time_min",
      "active_service_counters",
      "flow_level",
      "quality",
      "source_mode",
    ],
    passengerRows,
  ),
);

/* ==========================================================
 * 6. FLIGHT OPERATIONS
 * ========================================================== */

const flights = Array.from({ length: 18 }, (_, index) => {
  const scheduledHour = 1 + ((index * 1.25) % 22);

  const movementType = index % 2 === 0 ? "departure" : "arrival";

  const airlines = ["8M", "UB", "TG", "SQ", "AK", "MH"];

  const destinations = ["BKK", "SIN", "KUL", "CNX", "HAN", "DEL"];

  return {
    id: `FLT-${String(index + 1).padStart(3, "0")}`,
    flightNumber: `${airlines[index % airlines.length]}${330 + index}`,
    airline: airlines[index % airlines.length],
    aircraftType:
      index % 3 === 0 ? "A320" : index % 3 === 1 ? "B737-800" : "ATR72",
    movementType,
    origin:
      movementType === "arrival"
        ? destinations[index % destinations.length]
        : "RGN",
    destination:
      movementType === "departure"
        ? destinations[index % destinations.length]
        : "RGN",
    scheduledMinute: Math.round(scheduledHour * 60),
    gate: `G${String((index % 10) + 1).padStart(2, "0")}`,
    stand: `S${String((index % 14) + 1).padStart(2, "0")}`,
    passengers: 74 + ((index * 17) % 128),
  };
});

const flightRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const currentMinute = index * INTERVAL_MINUTES;

  flights.forEach((flight, flightIndex) => {
    const delayMinutes =
      flightIndex % 7 === 0
        ? 25
        : flightIndex % 11 === 0
          ? 45
          : flightIndex % 5 === 0
            ? 10
            : 0;

    const effectiveMinute = flight.scheduledMinute + delayMinutes;

    const delta = currentMinute - effectiveMinute;

    let status = "scheduled";
    let boardingStatus = "not_started";

    if (flight.movementType === "departure") {
      if (delta >= -60) {
        status = "check_in";
      }

      if (delta >= -40) {
        status = "boarding";
        boardingStatus = "boarding";
      }

      if (delta >= -10) {
        status = "gate_closed";
        boardingStatus = "completed";
      }

      if (delta >= 0) {
        status = "departed";
        boardingStatus = "completed";
      }
    } else {
      if (delta >= -30) {
        status = "approaching";
      }

      if (delta >= 0) {
        status = "landed";
      }

      if (delta >= 20) {
        status = "arrived";
      }
    }

    const pressureLevel =
      delayMinutes >= 40 ? "high" : delayMinutes >= 20 ? "elevated" : "normal";

    const scheduledTime = new Date(
      START_TIME.getTime() + flight.scheduledMinute * 60 * 1000,
    ).toISOString();

    const estimatedTime = new Date(
      START_TIME.getTime() + effectiveMinute * 60 * 1000,
    ).toISOString();

    flightRows.push({
      timestamp,
      flight_id: flight.id,
      flight_number: flight.flightNumber,
      airline: flight.airline,
      aircraft_type: flight.aircraftType,
      movement_type: flight.movementType,
      origin: flight.origin,
      destination: flight.destination,
      scheduled_time: scheduledTime,
      estimated_time: estimatedTime,
      actual_time: delta >= 0 ? estimatedTime : "",
      status,
      terminal_id: "T1",
      gate_id: flight.gate,
      stand_id: flight.stand,
      checkin_zone:
        flight.movementType === "departure"
          ? flightIndex % 2 === 0
            ? "CHECKIN-A"
            : "CHECKIN-B"
          : "",
      boarding_status: boardingStatus,
      passenger_count: flight.passengers,
      transfer_passenger_count: Math.round(flight.passengers * 0.12),
      baggage_belt:
        flight.movementType === "arrival" ? `B${(flightIndex % 4) + 1}` : "",
      delay_minutes: delayMinutes,
      delay_code:
        delayMinutes >= 40
          ? "OPS"
          : delayMinutes >= 20
            ? "TECH"
            : delayMinutes > 0
              ? "ATC"
              : "",
      pressure_level: pressureLevel,
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-flight-operations-24h-10min.csv",
    [
      "timestamp",
      "flight_id",
      "flight_number",
      "airline",
      "aircraft_type",
      "movement_type",
      "origin",
      "destination",
      "scheduled_time",
      "estimated_time",
      "actual_time",
      "status",
      "terminal_id",
      "gate_id",
      "stand_id",
      "checkin_zone",
      "boarding_status",
      "passenger_count",
      "transfer_passenger_count",
      "baggage_belt",
      "delay_minutes",
      "delay_code",
      "pressure_level",
      "quality",
      "source_mode",
    ],
    flightRows,
  ),
);

/* ==========================================================
 * 7. BAGGAGE OPERATIONS
 * ========================================================== */

const baggageAssets = [
  "BHS-CV-01",
  "BHS-CV-02",
  "BHS-CV-03",
  "BHS-CV-04",
  "BHS-CV-05",
  "BHS-SORT-01",
  "BHS-SORT-02",
  "BHS-SCAN-01",
  "BHS-SCAN-02",
  "BHS-BELT-01",
];

const baggageRows = [];
const bagTotals = new Map(
  baggageAssets.map((id, index) => [id, 420000 + index * 15000]),
);

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const demand = operationalDemand(hour);

  baggageAssets.forEach((assetId, assetIndex) => {
    const jam = assetId === "BHS-CV-04" && index >= 56 && index <= 58;

    const equipmentType = assetId.includes("SORT")
      ? "sorter"
      : assetId.includes("SCAN")
        ? "scanner"
        : assetId.includes("BELT")
          ? "baggage_belt"
          : "conveyor";

    const bagsPerMinute = jam
      ? 0
      : Math.round(5 + demand * 32 + seededNoise(index, assetIndex + 400) * 5);

    const previousTotal = bagTotals.get(assetId) ?? 0;

    const nextTotal = previousTotal + bagsPerMinute * INTERVAL_MINUTES;

    bagTotals.set(assetId, nextTotal);

    baggageRows.push({
      timestamp,
      asset_id: assetId,
      equipment_type: equipmentType,
      terminal_id: "T1",
      zone_id: "BAGGAGE-HANDLING",
      status: jam ? "fault" : "running",
      speed_mps: jam ? 0 : round(1.1 + demand * 0.55),
      motor_current_a: jam ? 0 : round(11 + demand * 12),
      active_power_kw: jam ? 0 : round(4.2 + demand * 7),
      bag_count_per_min: bagsPerMinute,
      total_bag_count: nextTotal,
      belt_occupancy_percent: jam ? 96 : round(18 + demand * 64),
      barcode_read_rate_percent: jam
        ? 92.4
        : round(98.4 + seededNoise(index, assetIndex + 410) * 1.2),
      reject_count: jam
        ? 14
        : Math.round(seededNoise(index, assetIndex + 420) * 2),
      missorted_bag_count: jam ? 3 : 0,
      jam_status: String(jam),
      emergency_stop_status: "false",
      destination_code: ["BKK", "SIN", "KUL", "HAN"][assetIndex % 4],
      availability_percent: jam ? 97.2 : 99.8,
      alarm_code: jam ? "CONVEYOR_JAM" : "",
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-baggage-operations-24h-10min.csv",
    [
      "timestamp",
      "asset_id",
      "equipment_type",
      "terminal_id",
      "zone_id",
      "status",
      "speed_mps",
      "motor_current_a",
      "active_power_kw",
      "bag_count_per_min",
      "total_bag_count",
      "belt_occupancy_percent",
      "barcode_read_rate_percent",
      "reject_count",
      "missorted_bag_count",
      "jam_status",
      "emergency_stop_status",
      "destination_code",
      "availability_percent",
      "alarm_code",
      "quality",
      "source_mode",
    ],
    baggageRows,
  ),
);

/* ==========================================================
 * 8. AIRPORT ENVIRONMENT
 * ========================================================== */

const environmentRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const daylight = daylightFactor(hour);

  const outdoorTemperature = round(
    25.5 + daylight * 9.2 + Math.sin(((hour - 4) / 24) * Math.PI * 2) * 1.8,
  );

  const humidity = round(clamp(86 - daylight * 28, 52, 92));

  const rainfall =
    hour >= 15.5 && hour <= 16.5 ? round(2 + seededNoise(index, 500) * 5) : 0;

  environmentRows.push({
    timestamp,
    station_id: "WS-AIRPORT-01",
    terminal_id: "AIRPORT",
    outdoor_temp_c: outdoorTemperature,
    wet_bulb_temp_c: round(outdoorTemperature - (100 - humidity) / 9),
    relative_humidity_percent: humidity,
    atmospheric_pressure_hpa: round(
      1006 - daylight * 2.4 + Math.sin(hour / 3) * 0.8,
    ),
    wind_speed_ms: round(1.8 + daylight * 3.4 + seededNoise(index, 510) * 1.2),
    wind_direction_deg: Math.round(150 + Math.sin(hour / 4) * 70),
    solar_radiation_wm2: Math.round(820 * daylight),
    rainfall_mm: rainfall,
    visibility_km: rainfall > 0 ? 5.5 : 11.5,
    pm25_ugm3: round(18 + operationalDemand(hour) * 18),
    pm10_ugm3: round(31 + operationalDemand(hour) * 25),
    outdoor_co2_ppm: round(416 + operationalDemand(hour) * 10),
    noise_dba: round(48 + operationalDemand(hour) * 22),
    weather_condition:
      rainfall > 0 ? "rain" : daylight > 0.3 ? "partly_cloudy" : "clear",
    quality: "good",
    source_mode: "simulated",
  });
}

summaries.push(
  writeCsv(
    "yia-airport-environment-24h-10min.csv",
    [
      "timestamp",
      "station_id",
      "terminal_id",
      "outdoor_temp_c",
      "wet_bulb_temp_c",
      "relative_humidity_percent",
      "atmospheric_pressure_hpa",
      "wind_speed_ms",
      "wind_direction_deg",
      "solar_radiation_wm2",
      "rainfall_mm",
      "visibility_km",
      "pm25_ugm3",
      "pm10_ugm3",
      "outdoor_co2_ppm",
      "noise_dba",
      "weather_condition",
      "quality",
      "source_mode",
    ],
    environmentRows,
  ),
);

/* ==========================================================
 * 9. BUILDING INFRASTRUCTURE
 * ========================================================== */

const buildingAssets = [
  ["LIFT-01", "elevator", "CORE-A"],
  ["LIFT-02", "elevator", "CORE-B"],
  ["LIFT-03", "elevator", "CORE-C"],
  ["ESC-01", "escalator", "DEPARTURE-HALL"],
  ["ESC-02", "escalator", "ARRIVAL-HALL"],
  ["LIGHT-ZONE-A", "lighting", "DEPARTURE-HALL"],
  ["LIGHT-ZONE-B", "lighting", "ARRIVAL-HALL"],
  ["DOOR-AUTO-01", "automatic_door", "ENTRANCE-A"],
  ["DOOR-AUTO-02", "automatic_door", "ENTRANCE-B"],
  ["SUMP-01", "sump_pump", "BASEMENT"],
  ["SUMP-02", "sump_pump", "UTILITY-ROOM"],
  ["ROOF-DRAIN-01", "drain_monitor", "ROOF"],
];

const buildingRows = [];
const cycleCounts = new Map(
  buildingAssets.map(([id], index) => [id, 180000 + index * 12000]),
);

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const demand = operationalDemand(hour);

  buildingAssets.forEach((asset, assetIndex) => {
    const [assetId, type, zone] = asset;

    const active =
      demand > 0.28 || type === "sump_pump" || type === "drain_monitor";

    const isLift = type === "elevator";

    const isEscalator = type === "escalator";

    const isLighting = type === "lighting";

    const isDoor = type === "automatic_door";

    const isWater = type === "sump_pump" || type === "drain_monitor";

    const cycles = cycleCounts.get(assetId) ?? 0;

    const cycleIncrement = isLift || isDoor ? Math.round(demand * 12) : 0;

    cycleCounts.set(assetId, cycles + cycleIncrement);

    const rainPeriod = hour >= 15.5 && hour <= 17;

    buildingRows.push({
      timestamp,
      asset_id: assetId,
      equipment_type: type,
      terminal_id: "T1",
      zone_id: zone,
      status: active ? "running" : "standby",
      operating_mode: "auto",
      current_floor: isLift
        ? 1 + Math.floor(seededNoise(index, assetIndex + 600) * 5)
        : "",
      direction: isLift
        ? seededNoise(index, assetIndex + 610) > 0.5
          ? "up"
          : "down"
        : isEscalator
          ? assetIndex % 2 === 0
            ? "up"
            : "down"
          : "",
      speed_percent:
        isLift || isEscalator ? (active ? round(55 + demand * 45) : 0) : "",
      motor_current_a:
        isLift || isEscalator
          ? active
            ? round(8 + demand * 19)
            : 0
          : isWater
            ? rainPeriod
              ? 16
              : 0
            : "",
      active_power_kw:
        isLift || isEscalator
          ? active
            ? round(4 + demand * 12)
            : 0
          : isLighting
            ? round(12 + demand * 16)
            : isWater
              ? rainPeriod
                ? 7.5
                : 0
              : "",
      door_state: isDoor
        ? seededNoise(index, assetIndex + 620) > 0.76
          ? "open"
          : "closed"
        : isLift
          ? "closed"
          : "",
      cycle_count: isLift || isDoor ? cycleCounts.get(assetId) : "",
      lux_level: isLighting ? round(350 + demand * 250) : "",
      dimming_percent: isLighting ? round(38 + demand * 58) : "",
      water_level_mm: isWater
        ? rainPeriod
          ? round(85 + seededNoise(index, assetIndex + 630) * 120)
          : round(18 + seededNoise(index, assetIndex + 640) * 20)
        : "",
      emergency_stop_status: isLift || isEscalator ? "false" : "",
      fire_recall_status: isLift ? "false" : "",
      alarm_code: "",
      quality: "good",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-building-infrastructure-24h-10min.csv",
    [
      "timestamp",
      "asset_id",
      "equipment_type",
      "terminal_id",
      "zone_id",
      "status",
      "operating_mode",
      "current_floor",
      "direction",
      "speed_percent",
      "motor_current_a",
      "active_power_kw",
      "door_state",
      "cycle_count",
      "lux_level",
      "dimming_percent",
      "water_level_mm",
      "emergency_stop_status",
      "fire_recall_status",
      "alarm_code",
      "quality",
      "source_mode",
    ],
    buildingRows,
  ),
);

/* ==========================================================
 * 10. PLATFORM AND EDGE HEALTH
 * ========================================================== */

const platformComponents = [
  ["EDGE-GW-01", "edge_gateway"],
  ["EDGE-GW-02", "edge_gateway"],
  ["PLC-HVAC-01", "plc"],
  ["DDC-AHU-01", "ddc"],
  ["NEXUS-WEB-01", "application"],
  ["NEXUS-API-01", "api"],
  ["NEXUS-DB-01", "database"],
  ["NEXUS-EVENT-01", "event_bus"],
];

const platformRows = [];

for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
  const timestamp = timestampAt(index);
  const hour = hourAt(index);
  const demand = operationalDemand(hour);

  platformComponents.forEach((component, componentIndex) => {
    const [componentId, type] = component;

    const degraded = componentId === "EDGE-GW-02" && index >= 92 && index <= 94;

    platformRows.push({
      timestamp,
      component_id: componentId,
      component_type: type,
      status: degraded ? "degraded" : "online",
      cpu_percent: round(
        clamp(
          14 + demand * 42 + seededNoise(index, componentIndex + 700) * 8,
          5,
          92,
        ),
      ),
      memory_percent: round(
        clamp(
          28 + demand * 33 + seededNoise(index, componentIndex + 710) * 6,
          10,
          92,
        ),
      ),
      disk_percent: round(34 + componentIndex * 2.2),
      latency_ms: degraded
        ? 240
        : round(3 + demand * 12 + seededNoise(index, componentIndex + 720) * 5),
      packet_loss_percent: degraded
        ? 4.8
        : round(seededNoise(index, componentIndex + 730) * 0.25, 3),
      message_rate_per_sec: Math.round(
        180 + demand * (type === "event_bus" ? 8200 : 1900),
      ),
      last_update_age_sec: degraded ? 28 : 1,
      clock_offset_ms: round(seededNoise(index, componentIndex + 740) * 5),
      battery_level_percent:
        type === "edge_gateway" ? round(96 - index * 0.015) : "",
      data_quality: degraded ? "uncertain" : "good",
      alarm_code: degraded ? "COMMUNICATION_DEGRADED" : "",
      source_mode: "simulated",
    });
  });
}

summaries.push(
  writeCsv(
    "yia-platform-health-24h-10min.csv",
    [
      "timestamp",
      "component_id",
      "component_type",
      "status",
      "cpu_percent",
      "memory_percent",
      "disk_percent",
      "latency_ms",
      "packet_loss_percent",
      "message_rate_per_sec",
      "last_update_age_sec",
      "clock_offset_ms",
      "battery_level_percent",
      "data_quality",
      "alarm_code",
      "source_mode",
    ],
    platformRows,
  ),
);

/* ==========================================================
 * MANIFEST
 * ========================================================== */

const manifestRows = summaries.map((summary, index) => ({
  dataset_id: `NEXUS-24H-${String(index + 1).padStart(2, "0")}`,
  filename: summary.filename,
  start_timestamp: summary.firstTimestamp,
  end_timestamp: summary.lastTimestamp,
  interval_minutes: INTERVAL_MINUTES,
  snapshot_count: SNAPSHOT_COUNT,
  row_count: summary.rowCount,
  column_count: summary.columnCount,
  timezone: "UTC",
  data_origin: "simulated",
  platform: "LUMI Nexus",
  version: "1.0.0",
}));

writeCsv(
  "dataset-manifest.csv",
  [
    "dataset_id",
    "filename",
    "start_timestamp",
    "end_timestamp",
    "interval_minutes",
    "snapshot_count",
    "row_count",
    "column_count",
    "timezone",
    "data_origin",
    "platform",
    "version",
  ],
  manifestRows,
);

console.log("");
console.log("Generated LUMI Nexus datasets:");

for (const summary of summaries) {
  console.log(`- ${summary.filename}: ${summary.rowCount} rows`);
}

console.log(`- dataset-manifest.csv: ${manifestRows.length} rows`);
