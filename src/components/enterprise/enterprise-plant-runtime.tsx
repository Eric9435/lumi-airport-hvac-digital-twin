"use client";

import { useEffect } from "react";

import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

export function EnterprisePlantRuntime() {
  const automaticControlEnabled = useEnterprisePlantStore(
    (state) => state.automaticControlEnabled,
  );

  const replayStatus = useSensorReplayStore((state) => state.status);

  const tick = useEnterprisePlantStore((state) => state.tick);

  const runtimeEnabled = automaticControlEnabled || replayStatus === "playing";

  useEffect(() => {
    /*
     * App startup:
     * Auto OFF + Replay not playing = no runtime.
     *
     * CSV replay:
     * Explicit Play Replay = runtime enabled.
     *
     * Manual automatic mode:
     * Explicit Auto ON = runtime enabled.
     */
    if (!runtimeEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      tick(1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [runtimeEnabled, tick]);

  return null;
}
