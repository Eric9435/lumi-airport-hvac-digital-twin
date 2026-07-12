"use client";

import { useEffect } from "react";

import { useSensorReplayStore } from "@/store/sensor-replay-store";

/*
 * Replay timing policy:
 *
 * 1×  = one 10-minute CSV snapshot every 2 seconds
 * 2×  = one snapshot every 1 second
 * 5×  = one snapshot every 400 ms
 * 10× = one snapshot every 200 ms
 *
 * This is accelerated historical replay, not wall-clock playback.
 */
const BASE_REPLAY_INTERVAL_MS = 2000;
const MINIMUM_REPLAY_INTERVAL_MS = 100;

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

    const intervalMilliseconds = Math.max(
      MINIMUM_REPLAY_INTERVAL_MS,
      BASE_REPLAY_INTERVAL_MS / Math.max(0.25, speed),
    );

    const timer = window.setTimeout(() => {
      stepForward();
    }, intervalMilliseconds);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentIndex, pause, rowCount, speed, status, stepForward]);

  return null;
}
