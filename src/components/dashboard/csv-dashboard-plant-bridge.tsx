"use client";

import { useEffect } from "react";

import { calculateEnergySample } from "@/lib/energy/energy-engine";
import { calculateRequiredChillerCount } from "@/lib/sensor-data/sensor-csv-parser";
import { useSensorReplayStore } from "@/store/sensor-replay-store";
import { useSimulationStore } from "@/store/simulation-store";

import type {
  AhuState,
  ChillerState,
  CoolingTowerState,
  EquipmentStatus,
  FlightDemandState,
  OperatingMode,
  PlantState,
  PumpState,
} from "@/types/hvac";

function round(value: number, decimals = 2): number {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function calculateTotalPowerKw(
  chillers: ChillerState[],
  ahus: AhuState[],
  chilledWaterPumps: PumpState[],
  condenserWaterPumps: PumpState[],
  coolingTowers: CoolingTowerState[],
): number {
  return round(
    [
      ...chillers,
      ...ahus,
      ...chilledWaterPumps,
      ...condenserWaterPumps,
      ...coolingTowers,
    ].reduce((total, equipment) => total + equipment.powerKw, 0),
  );
}

export function CsvDashboardPlantBridge() {
  const rows = useSensorReplayStore((state) => state.rows);

  const currentIndex = useSensorReplayStore((state) => state.currentIndex);

  const replayStatus = useSensorReplayStore((state) => state.status);

  const currentRow = rows[currentIndex];

  useEffect(() => {
    /*
     * Merely opening the app or loading a CSV must not run
     * the plant.
     *
     * Synchronization occurs only after a row has been
     * explicitly applied or replay is active.
     */
    if (
      !currentRow ||
      replayStatus === "empty" ||
      replayStatus === "ready" ||
      replayStatus === "error"
    ) {
      return;
    }

    const requiredChillers = calculateRequiredChillerCount(
      currentRow.effectiveCoolingLoadKw,
    );

    useSimulationStore.setState((state) => {
      const operatingMode: OperatingMode = "automatic";

      const loadPerChillerPercent =
        requiredChillers > 0
          ? Math.min(
              100,
              (currentRow.effectiveCoolingLoadKw / (requiredChillers * 52)) *
                100,
            )
          : 0;

      const chillers: ChillerState[] = state.chillers.map(
        (chiller, index): ChillerState => {
          const running = index < requiredChillers;

          const status: EquipmentStatus = running ? "running" : "standby";

          const powerKw = running
            ? round(chiller.ratedPowerKw * (loadPerChillerPercent / 100))
            : 0;

          return {
            ...chiller,
            status,
            mode: operatingMode,
            loadPercent: running ? round(loadPerChillerPercent, 1) : 0,
            powerKw,
            chilledWaterSupplyTempC: currentRow.chwSupplyTempC,
            chilledWaterReturnTempC: currentRow.chwReturnTempC,
            chilledWaterDeltaTC: round(
              currentRow.chwReturnTempC - currentRow.chwSupplyTempC,
            ),
            chilledWaterFlowM3h: running
              ? round(9 * (loadPerChillerPercent / 100))
              : 0,
            condenserWaterEnteringTempC: 29,
            condenserWaterLeavingTempC: running
              ? round(29 + 5 * (loadPerChillerPercent / 100))
              : 29,
            condenserWaterFlowM3h: running
              ? round(12 * (loadPerChillerPercent / 100))
              : 0,
            cop:
              running && powerKw > 0
                ? round(
                    (chiller.ratedCoolingCapacityKw *
                      (loadPerChillerPercent / 100)) /
                      powerKw,
                  )
                : 0,
            compressorRunning: running,
            lastUpdated: currentRow.timestamp,
          };
        },
      );

      const ahus: AhuState[] = state.ahus.map((ahu, index): AhuState => {
        const sensor = currentRow.ahus[index];

        if (!sensor) {
          return {
            ...ahu,
            status: "stopped",
            mode: operatingMode,
            fanSpeedPercent: 0,
            airflowCmh: 0,
            coolingValvePercent: 0,
            powerKw: 0,
            occupancy: 0,
            lastUpdated: currentRow.timestamp,
          };
        }

        const fanSpeedPercent =
          sensor.coolingDemandPercent > 0
            ? Math.min(100, Math.max(25, sensor.coolingDemandPercent))
            : 0;

        const airflowRatio = fanSpeedPercent / 100;

        /*
         * A temporary reference fan power is used because
         * the legacy dashboard model does not retain the
         * original design fan power separately.
         */
        const referenceFanPowerKw = 8;

        const status: EquipmentStatus =
          fanSpeedPercent > 0 ? "running" : "stopped";

        return {
          ...ahu,
          status,
          mode: operatingMode,
          fanSpeedPercent,
          airflowCmh: Math.round(ahu.designAirflowCmh * airflowRatio),
          zoneTempC: sensor.zoneTemperatureC,
          setpointC: sensor.setpointC,
          returnAirTempC: sensor.zoneTemperatureC,
          coolingValvePercent: sensor.coolingValvePercent,
          powerKw:
            fanSpeedPercent > 0
              ? round(referenceFanPowerKw * Math.pow(airflowRatio, 3))
              : 0,
          occupancy: Math.round(
            currentRow.passengerCount / Math.max(1, state.ahus.length),
          ),
          lastUpdated: currentRow.timestamp,
        };
      });

      const chilledWaterPumps: PumpState[] = state.chilledWaterPumps.map(
        (pump, index): PumpState => {
          const running = requiredChillers > 0 && index === 0;

          const speedPercent = running
            ? Math.min(100, 45 + requiredChillers * 12)
            : 0;

          const status: EquipmentStatus = running ? "running" : "standby";

          return {
            ...pump,
            status,
            mode: operatingMode,
            speedPercent,
            flowM3h: running ? requiredChillers * 9 : 0,
            headM: running ? 22 : 0,
            dischargePressureBar: running ? 3.2 : pump.suctionPressureBar,
            differentialPressureBar: running ? 1.8 : 0,
            powerKw: running ? round(5.5 * Math.pow(speedPercent / 100, 3)) : 0,
            currentA: running ? round(9.9 * (speedPercent / 100)) : 0,
            lastUpdated: currentRow.timestamp,
          };
        },
      );

      const condenserWaterPumps: PumpState[] = state.condenserWaterPumps.map(
        (pump, index): PumpState => {
          const running = requiredChillers > 0 && index === 0;

          const speedPercent = running
            ? Math.min(100, 50 + requiredChillers * 10)
            : 0;

          const status: EquipmentStatus = running ? "running" : "standby";

          return {
            ...pump,
            status,
            mode: operatingMode,
            speedPercent,
            flowM3h: running ? requiredChillers * 12 : 0,
            headM: running ? 19 : 0,
            dischargePressureBar: running ? 2.9 : pump.suctionPressureBar,
            differentialPressureBar: running ? 1.7 : 0,
            powerKw: running ? round(4 * Math.pow(speedPercent / 100, 3)) : 0,
            currentA: running ? round(7.2 * (speedPercent / 100)) : 0,
            lastUpdated: currentRow.timestamp,
          };
        },
      );

      const requiredTowerCount =
        requiredChillers === 0
          ? 0
          : Math.min(
              state.coolingTowers.length,
              Math.ceil(requiredChillers / 2),
            );

      const coolingTowers: CoolingTowerState[] = state.coolingTowers.map(
        (tower, index): CoolingTowerState => {
          const running = index < requiredTowerCount;

          const fanSpeedPercent = running
            ? Math.min(100, 45 + requiredChillers * 10)
            : 0;

          const status: EquipmentStatus = running ? "running" : "standby";

          const leavingWaterTempC = running
            ? round(Math.max(currentRow.outdoorWetBulbC + 4, 29))
            : 29;

          const enteringWaterTempC = running
            ? round(leavingWaterTempC + Math.max(2, requiredChillers * 1.2))
            : 29;

          return {
            ...tower,
            status,
            mode: operatingMode,
            fanSpeedPercent,
            enteringWaterTempC,
            leavingWaterTempC,
            rangeC: running ? round(enteringWaterTempC - leavingWaterTempC) : 0,
            approachC: running
              ? round(leavingWaterTempC - currentRow.outdoorWetBulbC)
              : 0,
            waterFlowM3h: running
              ? round((requiredChillers * 12) / Math.max(1, requiredTowerCount))
              : 0,
            ambientWetBulbTempC: currentRow.outdoorWetBulbC,
            powerKw: running
              ? round(2.2 * Math.pow(fanSpeedPercent / 100, 3))
              : 0,
            lastUpdated: currentRow.timestamp,
          };
        },
      );

      const totalPowerKw = calculateTotalPowerKw(
        chillers,
        ahus,
        chilledWaterPumps,
        condenserWaterPumps,
        coolingTowers,
      );

      const demandLevel: FlightDemandState["demandLevel"] =
        currentRow.ahuCoolingDemandPercent >= 90
          ? "peak"
          : currentRow.ahuCoolingDemandPercent >= 70
            ? "high"
            : currentRow.ahuCoolingDemandPercent >= 40
              ? "normal"
              : "low";

      const flightDemand: FlightDemandState = {
        ...state.flightDemand,
        date: currentRow.timestamp.slice(0, 10),
        currentFlights: currentRow.activeFlights,
        expectedPassengers: currentRow.passengerCount,
        arrivalPassengers: Math.round(currentRow.passengerCount * 0.45),
        departurePassengers: Math.round(currentRow.passengerCount * 0.55),
        demandLevel,
      };

      const plantState: PlantState = {
        timestamp: currentRow.timestamp,
        simulationRunning: false,
        simulationSpeed: state.simulationSpeed,
        operatingMode,
        totalPowerKw,
        totalEnergyKwh: state.totalEnergyKwh,
        activeAlarmCount: state.activeAlarmCount,
        expectedPassengers: currentRow.passengerCount,
        chillers,
        ahus,
        chilledWaterPumps,
        condenserWaterPumps,
        coolingTowers,
        flightDemand,
      };

      /*
       * Each CSV snapshot represents ten simulated minutes.
       * Replay speed affects display timing only and must not
       * alter the engineering energy interval.
       */
      const simulatedIntervalSeconds = 10 * 60;

      const previousEnergyKwh =
        state.energyHistory.at(-1)?.cumulativeEnergyKwh ?? state.totalEnergyKwh;

      const duplicateTimestamp =
        state.energyHistory.at(-1)?.timestamp === currentRow.timestamp;

      const calculatedSample = calculateEnergySample(
        plantState,
        simulatedIntervalSeconds,
        previousEnergyKwh,
      );

      const energySample = {
        ...calculatedSample,
        timestamp: currentRow.timestamp,
      };

      const energyHistory = duplicateTimestamp
        ? state.energyHistory
        : [...state.energyHistory, energySample].slice(-288);

      return {
        ...plantState,
        totalEnergyKwh: duplicateTimestamp
          ? state.totalEnergyKwh
          : energySample.cumulativeEnergyKwh,
        energyHistory,
      };
    });
  }, [currentIndex, currentRow, replayStatus]);

  return null;
}
