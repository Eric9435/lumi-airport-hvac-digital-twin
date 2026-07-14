"use client";

import { useEffect } from "react";

import { calculateRequiredChillerCount } from "@/lib/sensor-data/sensor-csv-parser";

import { useSensorReplayStore } from "@/store/sensor-replay-store";

import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";

export default function CsvSequenceTrigger() {
  const rows = useSensorReplayStore((s) => s.rows);

  const currentIndex = useSensorReplayStore((s) => s.currentIndex);

  const startSequence = usePlantSequenceRuntime((s) => s.startSequence);

  const active = usePlantSequenceRuntime((s) => s.active);

  useEffect(() => {
    const row = rows[currentIndex];

    if (!row) return;

    const requiredChillers = calculateRequiredChillerCount(
      row.effectiveCoolingLoadKw,
      52,
      85,
    );

    if (requiredChillers > 0 && !active) {
      startSequence();
    }
  }, [rows, currentIndex, active, startSequence]);

  return null;
}
