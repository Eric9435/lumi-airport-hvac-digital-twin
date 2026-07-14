"use client";

import { useEffect, useRef } from "react";

import { calculateRequiredChillerCount } from "@/lib/sensor-data/sensor-csv-parser";
import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

export default function CsvSequenceTrigger() {
  const rows = useSensorReplayStore((state) => state.rows);

  const currentIndex = useSensorReplayStore((state) => state.currentIndex);

  const startSequence = usePlantSequenceRuntime((state) => state.startSequence);

  const active = usePlantSequenceRuntime((state) => state.active);

  const lastTriggeredRowRef = useRef<string | null>(null);

  useEffect(() => {
    const row = rows[currentIndex];

    if (!row) return;

    const requiredChillers = calculateRequiredChillerCount(
      row.effectiveCoolingLoadKw,
      52,
      85,
    );

    const rowKey = [
      currentIndex,
      row.timestamp,
      row.effectiveCoolingLoadKw,
      requiredChillers,
    ].join("|");

    if (requiredChillers === 0) {
      lastTriggeredRowRef.current = null;
      return;
    }

    if (active) return;

    if (lastTriggeredRowRef.current === rowKey) return;

    lastTriggeredRowRef.current = rowKey;

    startSequence(requiredChillers);
  }, [rows, currentIndex, active, startSequence]);

  return null;
}
