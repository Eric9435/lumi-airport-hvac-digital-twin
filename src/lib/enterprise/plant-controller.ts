import type {
  CoolingTowerFanState,
  CoolingTowerRedundancyStatus,
  CoolingTowerState,
  EnterpriseMeter,
  EnterprisePlantState,
  EnterprisePumpState,
  PlantSequenceEvent,
  StarDeltaStarterState,
  TransformerState,
} from "@/types/enterprise-plant";

const CHILLER_CAPACITY_KW = 52;
const CHILLER_RATED_POWER_KW = 11;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, decimals = 2): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function createEvent(
  equipmentId: string,
  category: PlantSequenceEvent["category"],
  action: string,
  message: string,
  result: PlantSequenceEvent["result"] = "information",
): PlantSequenceEvent {
  const timestamp = new Date().toISOString();

  return {
    id: `${timestamp}-${equipmentId}-${action}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    sequenceId: `SEQ-${timestamp}`,
    equipmentId,
    category,
    action,
    result,
    source: "automatic",
    message,
  };
}

function updateMeter<T extends EnterpriseMeter>(
  equipment: T,
  running: boolean,
  powerKw: number,
  intervalSeconds: number,
): T {
  const intervalEnergyKwh = running
    ? Math.max(0, powerKw) * (intervalSeconds / 3600)
    : 0;

  return {
    ...equipment,
    powerKw: running ? round(Math.max(0, powerKw), 3) : 0,
    runtimeSeconds: equipment.runtimeSeconds + (running ? intervalSeconds : 0),
    totalEnergyKwh: round(equipment.totalEnergyKwh + intervalEnergyKwh, 6),
    todayEnergyKwh: round(equipment.todayEnergyKwh + intervalEnergyKwh, 6),
  };
}

function transformerAvailable(transformer: TransformerState): boolean {
  return (
    transformer.incomingSupplyAvailable &&
    transformer.protectionHealthy &&
    !transformer.overcurrentTrip &&
    !transformer.earthFaultTrip &&
    !transformer.overtemperatureTrip &&
    !transformer.maintenanceLockout &&
    transformer.mode !== "off" &&
    transformer.mode !== "maintenance"
  );
}

function startTransformer(
  transformer: TransformerState,
  groupPowerKw: number,
  intervalSeconds: number,
): TransformerState {
  const available = transformerAvailable(transformer);

  if (!available) {
    return {
      ...transformer,
      status: transformer.maintenanceLockout ? "maintenance" : "unavailable",
      incomingBreakerClosed: false,
      lvBreakerClosed: false,
      primaryVoltageKv: 0,
      secondaryVoltageV: 0,
      activePowerKw: 0,
      apparentPowerKva: 0,
      loadPercent: 0,
      primaryCurrentA: 0,
      secondaryCurrentA: 0,
      alarmMessage: "Transformer is unavailable for automatic operation.",
      powerKw: 0,
    };
  }

  const powerFactor = clamp(transformer.powerFactor, 0.75, 1);
  const activePowerKw = Math.max(0.8, groupPowerKw + 0.8);
  const apparentPowerKva = activePowerKw / powerFactor;
  const loadPercent = (apparentPowerKva / transformer.ratedCapacityKva) * 100;

  const primaryCurrentA = (apparentPowerKva * 1000) / (Math.sqrt(3) * 11000);

  const secondaryCurrentA = (apparentPowerKva * 1000) / (Math.sqrt(3) * 400);

  const wasRunning = transformer.status === "energized";
  const timestamp = new Date().toISOString();

  return updateMeter(
    {
      ...transformer,
      status: "energized",
      primaryVoltageKv: 11,
      secondaryVoltageV: 400,
      incomingBreakerClosed: true,
      lvBreakerClosed: true,
      activePowerKw: round(activePowerKw),
      apparentPowerKva: round(apparentPowerKva),
      loadPercent: round(loadPercent),
      primaryCurrentA: round(primaryCurrentA),
      secondaryCurrentA: round(secondaryCurrentA),
      oilTemperatureC: round(
        clamp(transformer.oilTemperatureC + loadPercent * 0.0008, 28, 78),
      ),
      windingTemperatureC: round(
        clamp(transformer.windingTemperatureC + loadPercent * 0.001, 30, 92),
      ),
      alarmMessage:
        loadPercent >= 90
          ? "Transformer load is approaching rated capacity."
          : null,
      lastStartedAt: wasRunning ? transformer.lastStartedAt : timestamp,
      startCount: wasRunning
        ? transformer.startCount
        : transformer.startCount + 1,
    },
    true,
    activePowerKw * 0.015,
    intervalSeconds,
  );
}

function stopTransformer(transformer: TransformerState): TransformerState {
  const wasRunning = transformer.status === "energized";

  return {
    ...transformer,
    status: "off",
    incomingBreakerClosed: false,
    lvBreakerClosed: false,
    primaryVoltageKv: 0,
    secondaryVoltageV: 0,
    activePowerKw: 0,
    apparentPowerKva: 0,
    loadPercent: 0,
    primaryCurrentA: 0,
    secondaryCurrentA: 0,
    powerKw: 0,
    lastStoppedAt: wasRunning
      ? new Date().toISOString()
      : transformer.lastStoppedAt,
  };
}

function startPump(
  pump: EnterprisePumpState,
  speedPercent: number,
  intervalSeconds: number,
): EnterprisePumpState {
  const speedRatio = clamp(speedPercent, 0, 100) / 100;
  const wasRunning = pump.status === "running";
  const timestamp = new Date().toISOString();

  return updateMeter(
    {
      ...pump,
      status: "running",
      speedPercent: round(speedPercent),
      flowM3h: round(pump.designFlowM3h * speedRatio),
      headM: round(
        (pump.category === "primary"
          ? 22
          : pump.category === "secondary"
            ? 28
            : 19) *
          speedRatio *
          speedRatio,
      ),
      differentialPressureBar: round(
        (pump.category === "secondary" ? 2.2 : 1.7) * speedRatio * speedRatio,
      ),
      currentAmpere: round(pump.ratedAmpere * speedRatio * 0.88),
      flowProven: speedPercent >= 30,
      lastStartedAt: wasRunning ? pump.lastStartedAt : timestamp,
      startCount: wasRunning ? pump.startCount : pump.startCount + 1,
    },
    true,
    pump.ratedPowerKw * speedRatio * speedRatio * speedRatio,
    intervalSeconds,
  );
}

function stopPump(pump: EnterprisePumpState): EnterprisePumpState {
  const wasRunning = pump.status === "running";

  return {
    ...pump,
    status: pump.dutyRole === "standby" ? "standby" : "stopped",
    speedPercent: 0,
    flowM3h: 0,
    headM: 0,
    differentialPressureBar: 0,
    currentAmpere: 0,
    flowProven: false,
    powerKw: 0,
    lastStoppedAt: wasRunning ? new Date().toISOString() : pump.lastStoppedAt,
  };
}

function updateStarter(
  starter: StarDeltaStarterState,
  required: boolean,
  intervalSeconds: number,
): StarDeltaStarterState {
  if (!required) {
    return {
      ...starter,
      status: "stopped",
      mainContactorOn: false,
      starContactorOn: false,
      deltaContactorOn: false,
      sequenceElapsedSeconds: 0,
      lastSequenceStep: "Starter stopped",
    };
  }

  if (
    !starter.overloadHealthy ||
    !starter.phaseFailureHealthy ||
    !starter.phaseSequenceHealthy ||
    !starter.controlVoltageHealthy
  ) {
    return {
      ...starter,
      status: "tripped",
      mainContactorOn: false,
      starContactorOn: false,
      deltaContactorOn: false,
      tripReason: "Starter electrical protection interlock failed.",
      lastSequenceStep: "Protection trip",
    };
  }

  if (starter.starContactorOn && starter.deltaContactorOn) {
    return {
      ...starter,
      status: "tripped",
      mainContactorOn: false,
      starContactorOn: false,
      deltaContactorOn: false,
      tripReason: "Illegal simultaneous Star and Delta contactor state.",
      lastSequenceStep: "Critical Star–Delta interlock trip",
    };
  }

  const elapsed = starter.sequenceElapsedSeconds + intervalSeconds;
  const timestamp = new Date().toISOString();

  if (elapsed < 1) {
    return {
      ...starter,
      status: "interlock-check",
      mainContactorOn: false,
      starContactorOn: false,
      deltaContactorOn: false,
      sequenceElapsedSeconds: elapsed,
      startRequestedAt: starter.startRequestedAt ?? timestamp,
      lastSequenceStep: "Checking electrical and mechanical interlocks",
    };
  }

  if (elapsed < 2) {
    return {
      ...starter,
      status: "main-contactor-engaged",
      mainContactorOn: true,
      starContactorOn: false,
      deltaContactorOn: false,
      sequenceElapsedSeconds: elapsed,
      lastSequenceStep: "Main contactor energized",
    };
  }

  if (elapsed < 9) {
    return {
      ...starter,
      status: elapsed < 3 ? "star-starting" : "star-running",
      mainContactorOn: true,
      starContactorOn: true,
      deltaContactorOn: false,
      sequenceElapsedSeconds: elapsed,
      starStartedAt: starter.starStartedAt ?? timestamp,
      lastSequenceStep: "Motor accelerating in Star",
    };
  }

  if (elapsed < 10) {
    return {
      ...starter,
      status: "star-delta-transition",
      mainContactorOn: true,
      starContactorOn: false,
      deltaContactorOn: false,
      sequenceElapsedSeconds: elapsed,
      transitionStartedAt: starter.transitionStartedAt ?? timestamp,
      lastSequenceStep: "Star open; transition delay active",
    };
  }

  return {
    ...starter,
    status: "delta-running",
    mainContactorOn: true,
    starContactorOn: false,
    deltaContactorOn: true,
    sequenceElapsedSeconds: elapsed,
    deltaStartedAt: starter.deltaStartedAt ?? timestamp,
    lastSequenceStep: "Delta contactor energized; motor running",
  };
}

function updateFanDiagnostic(fan: CoolingTowerFanState): CoolingTowerFanState {
  if (fan.status !== "running") {
    return {
      ...fan,
      currentLoadPercent: 0,
      beltCondition: "not-evaluated",
      diagnosticMessage: "Fan is stopped; belt condition is not evaluated.",
    };
  }

  const expectedCurrent = Math.max(0.2, fan.expectedCurrentAmpere);
  const normalizedPercent = (fan.currentAmpere / expectedCurrent) * 100;

  if (normalizedPercent >= 80) {
    return {
      ...fan,
      currentLoadPercent: round(normalizedPercent),
      beltCondition: "normal",
      diagnosticMessage:
        "Motor current is consistent with the commanded fan speed.",
    };
  }

  if (normalizedPercent >= 65) {
    return {
      ...fan,
      currentLoadPercent: round(normalizedPercent),
      beltCondition: "possible-slip-or-low-load",
      diagnosticMessage:
        "Possible belt slip or low mechanical load. Verify belt tension, fan RPM, pulley alignment, vibration and current-sensor accuracy.",
    };
  }

  return {
    ...fan,
    currentLoadPercent: round(normalizedPercent),
    beltCondition: "possible-belt-problem",
    diagnosticMessage:
      "Possible belt problem, disconnected fan load or abnormal current reading. Inspect belt tension, fan RPM, vibration, pulley alignment, motor condition, airflow resistance and sensor calibration.",
  };
}

function runFan(
  fan: CoolingTowerFanState,
  speedPercent: number,
  intervalSeconds: number,
): CoolingTowerFanState {
  const speedRatio = clamp(speedPercent, 0, 100) / 100;
  const wasRunning = fan.status === "running";
  const timestamp = new Date().toISOString();

  const expectedCurrentAmpere = fan.ratedAmpere * Math.max(0.2, speedRatio);

  const measuredCurrentAmpere =
    expectedCurrentAmpere * (0.9 + Math.random() * 0.08);

  const nextFan: CoolingTowerFanState = updateMeter(
    {
      ...fan,
      status: "running" as const,
      speedPercent,
      expectedCurrentAmpere: round(expectedCurrentAmpere),
      currentAmpere: round(measuredCurrentAmpere),
      minimumRuntimeRemainingSeconds: Math.max(
        0,
        fan.minimumRuntimeRemainingSeconds - intervalSeconds,
      ),
      minimumOffTimeRemainingSeconds: 0,
      lastStartedAt: wasRunning ? fan.lastStartedAt : timestamp,
      startCount: wasRunning ? fan.startCount : fan.startCount + 1,
    },
    true,
    fan.ratedPowerKw * speedRatio * speedRatio * speedRatio,
    intervalSeconds,
  );

  return updateFanDiagnostic(nextFan);
}

function stopFan(
  fan: CoolingTowerFanState,
  minimumOffTimeSeconds: number,
): CoolingTowerFanState {
  const wasRunning = fan.status === "running";

  return updateFanDiagnostic({
    ...fan,
    status: "stopped",
    speedPercent: 0,
    powerKw: 0,
    currentAmpere: 0,
    expectedCurrentAmpere: 0,
    minimumRuntimeRemainingSeconds: 0,
    minimumOffTimeRemainingSeconds: wasRunning
      ? minimumOffTimeSeconds
      : Math.max(0, fan.minimumOffTimeRemainingSeconds - 1),
    lastStoppedAt: wasRunning ? new Date().toISOString() : fan.lastStoppedAt,
  });
}

function calculateCoolingDemand(state: EnterprisePlantState): {
  predictedCoolingLoadKw: number;
  coolingDemandPercent: number;
  requiredChillerCount: number;
} {
  const occupancyLoadKw = state.occupancy * 0.12;

  const outdoorLoadKw =
    Math.max(0, state.outdoorDryBulbTemperatureC - 24) * 5.5;

  const humidityLoadKw = Math.max(0, state.outdoorWetBulbTemperatureC - 20) * 4;

  const baseBuildingLoadKw = 28;

  const predictedCoolingLoadKw =
    occupancyLoadKw + outdoorLoadKw + humidityLoadKw + baseBuildingLoadKw;

  const totalRatedCapacityKw = CHILLER_CAPACITY_KW * 4;

  const coolingDemandPercent =
    (predictedCoolingLoadKw / totalRatedCapacityKw) * 100;

  const usableCapacityPerChillerKw =
    CHILLER_CAPACITY_KW *
    (state.configuration.usableChillerCapacityPercent / 100);

  const requiredChillerCount =
    predictedCoolingLoadKw <= 2
      ? 0
      : clamp(
          Math.ceil(predictedCoolingLoadKw / usableCapacityPerChillerKw),
          1,
          4,
        );

  return {
    predictedCoolingLoadKw: round(predictedCoolingLoadKw),
    coolingDemandPercent: round(coolingDemandPercent),
    requiredChillerCount,
  };
}

function calculateRedundancy(
  towers: CoolingTowerState[],
  requiredTowerCount: number,
): CoolingTowerRedundancyStatus {
  const healthyCount = towers.filter(
    (tower) =>
      tower.available &&
      tower.status !== "fault" &&
      tower.status !== "maintenance",
  ).length;

  if (healthyCount < requiredTowerCount) {
    return "insufficient-capacity";
  }

  if (healthyCount === requiredTowerCount) {
    return "degraded";
  }

  if (healthyCount === towers.length) {
    return "full-redundancy";
  }

  return "redundancy-available";
}

export function runEnterprisePlantTick(
  state: EnterprisePlantState,
  intervalSeconds: number,
): EnterprisePlantState {
  const timestamp = new Date().toISOString();
  const demand = calculateCoolingDemand(state);

  const availableGroups = state.groups
    .map((group) => {
      const transformer = state.transformers.find(
        (item) => item.id === group.transformerId,
      );

      return {
        ...group,
        available: transformer ? transformerAvailable(transformer) : false,
      };
    })
    .sort((a, b) => a.groupId.localeCompare(b.groupId));

  const selectedIds = new Set(
    availableGroups
      .filter((group) => group.available)
      .slice(0, demand.requiredChillerCount)
      .map((group) => group.groupId),
  );

  const groups = availableGroups.map((group) => {
    const selected = selectedIds.has(group.groupId);

    return {
      ...group,
      selected,
      required: selected,
      status: selected ? ("running" as const) : ("standby" as const),
      currentStep: selected
        ? "Automatic sequence active"
        : group.available
          ? "Standby"
          : "Unavailable",
      lastCompletedStep: selected ? "Group selected" : group.lastCompletedStep,
      failedStep: group.available ? null : "Transformer availability",
      message: selected
        ? "Selected to satisfy calculated cooling demand."
        : group.available
          ? "Healthy standby group."
          : "Group skipped because transformer is unavailable.",
    };
  });

  const selectedChillerIds = new Set(
    groups.filter((group) => group.selected).map((group) => group.chillerId),
  );

  const groupLoadKw =
    demand.requiredChillerCount > 0
      ? demand.predictedCoolingLoadKw / demand.requiredChillerCount
      : 0;

  const primaryPumps = state.primaryPumps.map((pump) =>
    pump.associatedChillerId && selectedChillerIds.has(pump.associatedChillerId)
      ? startPump(pump, 82, intervalSeconds)
      : stopPump(pump),
  );

  const condenserPumps = state.condenserPumps.map((pump) =>
    pump.associatedChillerId && selectedChillerIds.has(pump.associatedChillerId)
      ? startPump(pump, 85, intervalSeconds)
      : stopPump(pump),
  );

  const transformers = state.transformers.map((transformer) =>
    selectedChillerIds.has(transformer.associatedChillerId)
      ? startTransformer(
          transformer,
          Math.min(CHILLER_RATED_POWER_KW, groupLoadKw / 4.7) + 6,
          intervalSeconds,
        )
      : stopTransformer(transformer),
  );

  const starters = state.starters.map((starter) =>
    updateStarter(
      starter,
      selectedChillerIds.has(starter.associatedChillerId),
      intervalSeconds,
    ),
  );

  const runningChillerCount = starters.filter(
    (starter) => starter.status === "delta-running",
  ).length;

  const ahuDemandPercent = clamp(demand.coolingDemandPercent, 0, 100);

  const secondaryPumps = state.secondaryPumps.map((pump, index) => {
    const shouldRun =
      runningChillerCount > 0 && (index === 0 || ahuDemandPercent >= 72);

    if (!shouldRun) {
      return stopPump(pump);
    }

    const speed =
      index === 0
        ? clamp(45 + ahuDemandPercent * 0.45, 45, 100)
        : clamp(50 + (ahuDemandPercent - 70), 50, 100);

    return startPump(
      {
        ...pump,
        dutyRole: index === 0 ? "duty" : "assist",
      },
      speed,
      intervalSeconds,
    );
  });

  const heatRejectionKw =
    demand.predictedCoolingLoadKw +
    runningChillerCount * CHILLER_RATED_POWER_KW;

  const requiredFanCount =
    runningChillerCount === 0
      ? 0
      : clamp(Math.ceil(heatRejectionKw / 32), 1, 20);

  const healthyTowers = state.coolingTowers
    .filter(
      (tower) =>
        tower.available &&
        tower.status !== "fault" &&
        tower.status !== "maintenance",
    )
    .sort((a, b) => a.runtimeSeconds - b.runtimeSeconds);

  const requiredTowerCount =
    requiredFanCount === 0 ? 0 : clamp(Math.ceil(requiredFanCount / 5), 1, 4);

  const activeTowerIds = new Set(
    healthyTowers.slice(0, requiredTowerCount).map((tower) => tower.id),
  );

  let remainingFans = requiredFanCount;

  const coolingTowers = state.coolingTowers.map((tower) => {
    const active = activeTowerIds.has(tower.id);

    const fansToRun = active ? Math.min(5, remainingFans) : 0;

    remainingFans -= fansToRun;

    const fans = tower.fans.map((fan, index) =>
      index < fansToRun
        ? runFan(
            fan,
            clamp(60 + demand.coolingDemandPercent * 0.35, 60, 100),
            intervalSeconds,
          )
        : stopFan(fan, state.configuration.minimumFanOffTimeSeconds),
    );

    const runningFans = fans.filter((fan) => fan.status === "running");

    const towerPowerKw = runningFans.reduce(
      (total, fan) => total + fan.powerKw,
      0,
    );

    const currentHeatRejectionKw =
      requiredFanCount > 0
        ? (heatRejectionKw * runningFans.length) / requiredFanCount
        : 0;

    return {
      ...tower,
      role: active
        ? tower.id === healthyTowers[0]?.id
          ? ("lead" as const)
          : ("assist" as const)
        : tower.available
          ? ("standby" as const)
          : tower.role,
      status:
        runningFans.length > 0
          ? ("running" as const)
          : tower.available
            ? ("standby" as const)
            : tower.status,
      currentHeatRejectionKw: round(currentHeatRejectionKw),
      enteringWaterTemperatureC: runningFans.length
        ? round(32 + demand.coolingDemandPercent * 0.03)
        : 29,
      leavingWaterTemperatureC: runningFans.length
        ? round(29 + Math.max(0, demand.coolingDemandPercent - 75) * 0.015)
        : 29,
      approachTemperatureC: runningFans.length
        ? round(4 + Math.max(0, demand.coolingDemandPercent - 85) * 0.02)
        : 4,
      runtimeSeconds:
        tower.runtimeSeconds + (runningFans.length > 0 ? intervalSeconds : 0),
      fans,
      alarmMessage:
        towerPowerKw > 0 && runningFans.length < fansToRun
          ? "Cooling tower fan availability is below requested stage."
          : null,
    };
  });

  const coolingTowerFanPowerKw = coolingTowers.reduce(
    (towerTotal, tower) =>
      towerTotal +
      tower.fans.reduce((fanTotal, fan) => fanTotal + fan.powerKw, 0),
    0,
  );

  const transformerLossPowerKw = transformers.reduce(
    (total, transformer) => total + transformer.powerKw,
    0,
  );

  const primaryPumpPowerKw = primaryPumps.reduce(
    (total, pump) => total + pump.powerKw,
    0,
  );

  const secondaryPumpPowerKw = secondaryPumps.reduce(
    (total, pump) => total + pump.powerKw,
    0,
  );

  const condenserPumpPowerKw = condenserPumps.reduce(
    (total, pump) => total + pump.powerKw,
    0,
  );

  const chillerPowerKw =
    runningChillerCount *
    Math.min(
      CHILLER_RATED_POWER_KW,
      demand.requiredChillerCount > 0
        ? demand.predictedCoolingLoadKw / demand.requiredChillerCount / 4.7
        : 0,
    );

  const totalPlantPowerKw =
    transformerLossPowerKw +
    primaryPumpPowerKw +
    secondaryPumpPowerKw +
    condenserPumpPowerKw +
    coolingTowerFanPowerKw +
    chillerPowerKw;

  const intervalEnergyKwh = totalPlantPowerKw * (intervalSeconds / 3600);

  const plantRunning = totalPlantPowerKw > 0 || runningChillerCount > 0;

  const coolingTowerRedundancyStatus = calculateRedundancy(
    coolingTowers,
    requiredTowerCount,
  );

  const sequenceState =
    coolingTowerRedundancyStatus === "insufficient-capacity"
      ? ("faulted" as const)
      : coolingTowerRedundancyStatus === "degraded"
        ? ("degraded" as const)
        : runningChillerCount < demand.requiredChillerCount
          ? ("starting-star-delta" as const)
          : runningChillerCount > 0
            ? ("running" as const)
            : ("idle" as const);

  const changedRequiredCount =
    state.requiredChillerCount !== demand.requiredChillerCount;

  const newEvents = [...state.sequenceEvents];

  if (changedRequiredCount) {
    newEvents.push(
      createEvent(
        "PLANT",
        "plant",
        "REQUIRED_CHILLER_COUNT_CHANGED",
        `Required chiller count changed from ${state.requiredChillerCount} to ${demand.requiredChillerCount}.`,
        "information",
      ),
    );
  }

  return {
    ...state,
    timestamp,
    sequenceState,
    currentSequenceId: `SEQ-${timestamp}`,
    currentSequenceMessage:
      coolingTowerRedundancyStatus === "insufficient-capacity"
        ? "Available cooling-tower capacity is insufficient."
        : runningChillerCount < demand.requiredChillerCount
          ? "Automatic group startup sequence is in progress."
          : runningChillerCount > 0
            ? `${runningChillerCount} chiller group(s) running automatically.`
            : "No active cooling demand.",
    lastCompletedStep:
      runningChillerCount > 0
        ? "Chiller groups running in Delta"
        : "Demand calculation complete",
    failedSequenceStep:
      coolingTowerRedundancyStatus === "insufficient-capacity"
        ? "Cooling-tower availability"
        : null,

    predictedCoolingLoadKw: demand.predictedCoolingLoadKw,
    coolingDemandPercent: demand.coolingDemandPercent,
    requiredChillerCount: demand.requiredChillerCount,

    totalPlantPowerKw: round(totalPlantPowerKw),
    totalPlantEnergyKwh: round(
      state.totalPlantEnergyKwh + intervalEnergyKwh,
      6,
    ),
    todayPlantEnergyKwh: round(
      state.todayPlantEnergyKwh + intervalEnergyKwh,
      6,
    ),
    totalElectricityCostMmk: round(
      (state.totalPlantEnergyKwh + intervalEnergyKwh) *
        state.configuration.tariffMmkPerKwh,
    ),
    todayElectricityCostMmk: round(
      (state.todayPlantEnergyKwh + intervalEnergyKwh) *
        state.configuration.tariffMmkPerKwh,
    ),
    plantRuntimeSeconds:
      state.plantRuntimeSeconds + (plantRunning ? intervalSeconds : 0),

    transformers,
    starters,
    primaryPumps,
    secondaryPumps,
    condenserPumps,
    coolingTowers,
    groups,
    sequenceEvents: newEvents.slice(-200),
    coolingTowerRedundancyStatus,
  };
}
