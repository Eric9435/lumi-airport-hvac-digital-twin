"use client";

import { useEffect } from "react";

import { useSensorReplayStore } from "@/store/sensor-replay-store";

export function SensorReplayRuntime() {
  const status = useSensorReplayStore((state) => state.status);
  const speed = useSensorReplayStore((state) => state.speed);
  const stepForward = useSensorReplayStore((state) => state.stepForward);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    // Demo replay:
    // 1× = one 10-minute CSV snapshot every 2 seconds.
    const delayMilliseconds = Math.max(100, 2000 / speed);

    const timer = window.setInterval(() => {
      stepForward();
    }, delayMilliseconds);

    return () => {
      window.clearInterval(timer);
    };
  }, [speed, status, stepForward]);

  return null;
}
