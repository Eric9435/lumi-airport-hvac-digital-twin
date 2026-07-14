"use client";

import { useEffect } from "react";

import {
  getCsvIntervalSeconds,
  getReplayIntervalMilliseconds,
} from "@/lib/sensor-data/replay-timing";
import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

const REPLAY_METER_DRIVER_INTERVAL_MS = 100;

export function EnterprisePlantRuntime() {
  const automaticControlEnabled = useEnterprisePlantStore(
    (state) => state.automaticControlEnabled,
  );
  const replayStatus = useSensorReplayStore((state) => state.status);
  const rows = useSensorReplayStore((state) => state.rows);
  const currentIndex = useSensorReplayStore((state) => state.currentIndex);
  const speed = useSensorReplayStore((state) => state.speed);
  const tick = useEnterprisePlantStore((state) => state.tick);

  useEffect(() => {
    if (replayStatus === "playing" && rows.length > 0) {
      const csvIntervalSeconds = getCsvIntervalSeconds(rows, currentIndex);
      const replayIntervalMilliseconds = getReplayIntervalMilliseconds(speed);
      const simulatedSecondsPerDriverTick =
        csvIntervalSeconds *
        (REPLAY_METER_DRIVER_INTERVAL_MS / replayIntervalMilliseconds);

      const timer = window.setInterval(() => {
        tick(simulatedSecondsPerDriverTick);
      }, REPLAY_METER_DRIVER_INTERVAL_MS);

      return () => {
        window.clearInterval(timer);
      };
    }

    if (!automaticControlEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      tick(1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [automaticControlEnabled, currentIndex, replayStatus, rows, speed, tick]);

  return null;
}
