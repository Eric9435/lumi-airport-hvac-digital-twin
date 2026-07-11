function readPositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "LUMI Airport HVAC Digital Twin",

  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",

  simulationMode: process.env.NEXT_PUBLIC_SIMULATION_MODE !== "false",

  simulationTickMs: readPositiveNumber(
    process.env.NEXT_PUBLIC_SIMULATION_TICK_MS,
    1000,
  ),

  snapshotIntervalMs: readPositiveNumber(
    process.env.NEXT_PUBLIC_SNAPSHOT_INTERVAL_MS,
    60000,
  ),

  enableAnimations: process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== "false",

  enableSound: process.env.NEXT_PUBLIC_ENABLE_SOUND === "true",

  enableLumi: process.env.NEXT_PUBLIC_ENABLE_LUMI !== "false",
} as const;
