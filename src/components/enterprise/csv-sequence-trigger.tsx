"use client";

import { useEffect, useRef } from "react";

import {
  getCsvIntervalSeconds,
  getNextCsvTimestamp,
  getReplayIntervalMilliseconds,
} from "@/lib/sensor-data/replay-timing";
import { calculateRequiredChillerCount } from "@/lib/sensor-data/sensor-csv-parser";
import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

const SEQUENCE_DRIVER_INTERVAL_MS = 100;

export default function CsvSequenceTrigger() {
  const rows = useSensorReplayStore((state) => state.rows);
  const currentIndex = useSensorReplayStore((state) => state.currentIndex);
  const replayStatus = useSensorReplayStore((state) => state.status);
  const speed = useSensorReplayStore((state) => state.speed);

  const active = usePlantSequenceRuntime((state) => state.active);
  const requestSequence = usePlantSequenceRuntime(
    (state) => state.requestSequence,
  );
  const tick = usePlantSequenceRuntime((state) => state.tick);

  const lastRequestedRowRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      replayStatus === "empty" ||
      replayStatus === "ready" ||
      replayStatus === "error"
    ) {
      return;
    }

    const row = rows[currentIndex];

    if (!row) {
      return;
    }

    const targetChillers = calculateRequiredChillerCount(
      row.effectiveCoolingLoadKw,
      52,
      85,
    );

    const rowKey = [
      currentIndex,
      row.timestamp,
      row.effectiveCoolingLoadKw,
      targetChillers,
      speed,
    ].join("|");

    if (lastRequestedRowRef.current === rowKey) {
      return;
    }

    lastRequestedRowRef.current = rowKey;

    requestSequence({
      targetChillers,
      csvTimestamp: row.timestamp,
      nextCsvTimestamp: getNextCsvTimestamp(rows, currentIndex),
      csvIntervalSeconds: getCsvIntervalSeconds(rows, currentIndex),
      replayIntervalMilliseconds: getReplayIntervalMilliseconds(speed),
    });
  }, [currentIndex, replayStatus, requestSequence, rows, speed]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = window.setInterval(() => {
      tick(SEQUENCE_DRIVER_INTERVAL_MS);
    }, SEQUENCE_DRIVER_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [active, tick]);

  return null;
}
