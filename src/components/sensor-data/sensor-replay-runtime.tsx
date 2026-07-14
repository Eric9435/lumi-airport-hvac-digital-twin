"use client";

import { useEffect } from "react";

import { getReplayIntervalMilliseconds } from "@/lib/sensor-data/replay-timing";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

export function SensorReplayRuntime() {
  const status = useSensorReplayStore((state) => state.status);
  const speed = useSensorReplayStore((state) => state.speed);
  const currentIndex = useSensorReplayStore((state) => state.currentIndex);
  const rowCount = useSensorReplayStore((state) => state.rows.length);
  const stepForward = useSensorReplayStore((state) => state.stepForward);
  const pause = useSensorReplayStore((state) => state.pause);

  useEffect(() => {
    if (status !== "playing" || rowCount === 0) {
      return;
    }

    if (currentIndex >= rowCount - 1) {
      pause();
      return;
    }

    const timer = window.setTimeout(() => {
      stepForward();
    }, getReplayIntervalMilliseconds(speed));

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentIndex, pause, rowCount, speed, status, stepForward]);

  return null;
}
