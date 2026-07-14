"use client";

import { CsvDashboardPlantBridge } from "@/components/dashboard/csv-dashboard-plant-bridge";
import { EnterprisePlantRuntime } from "@/components/enterprise/enterprise-plant-runtime";
import { SensorReplayRuntime } from "@/components/sensor-data/sensor-replay-runtime";
import CsvSequenceTrigger from "@/components/enterprise/csv-sequence-trigger";

/**
 * Global runtime host.
 *
 * These runtime components must remain mounted while navigating
 * between Dashboard, Sensor CSV, Plant Sequence and Plant Topology.
 *
 * Mount exactly once to prevent:
 * - replay stopping during route changes;
 * - duplicate replay timers;
 * - duplicate plant ticks;
 * - duplicate energy accumulation.
 */
export function LumiGlobalRuntimes() {
  return (
    <>
      <SensorReplayRuntime />
      <CsvSequenceTrigger />
      <EnterprisePlantRuntime />
      <CsvDashboardPlantBridge />
    </>
  );
}
