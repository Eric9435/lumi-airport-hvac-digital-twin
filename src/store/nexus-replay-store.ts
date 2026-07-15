import { create } from "zustand";

export const NEXUS_REPLAY_SNAPSHOT_COUNT = 144;

export const NEXUS_REPLAY_SPEED_OPTIONS = [
  {
    label: "60×",
    value: 60,
    delayMs: 10_000,
  },
  {
    label: "120×",
    value: 120,
    delayMs: 5_000,
  },
  {
    label: "600×",
    value: 600,
    delayMs: 1_000,
  },
  {
    label: "1200×",
    value: 1200,
    delayMs: 500,
  },
] as const;

export type NexusReplaySpeed =
  (typeof NEXUS_REPLAY_SPEED_OPTIONS)[number]["value"];

export type NexusReplayStatus =
  "idle" | "loading" | "ready" | "playing" | "paused" | "complete" | "error";

export interface NexusReplaySharedState {
  currentIndex: number;
  requestedIndex: number;
  snapshotCount: number;
  timestamp: string | null;
  speed: NexusReplaySpeed;
  status: NexusReplayStatus;
  error: string | null;
  physicalControlEnabled: false;

  beginLoading: () => void;

  acceptSnapshot: (index: number, timestamp: string, complete: boolean) => void;

  setRequestedIndex: (index: number) => void;

  setSpeed: (speed: NexusReplaySpeed) => void;

  play: () => void;
  pause: () => void;
  reset: () => void;

  seek: (index: number) => number;
  next: () => number;
  previous: () => number;

  fail: (message: string) => void;
  clearError: () => void;
}

export function clampNexusReplayIndex(
  index: number,
  snapshotCount = NEXUS_REPLAY_SNAPSHOT_COUNT,
): number {
  if (!Number.isFinite(index) || snapshotCount <= 0) {
    return 0;
  }

  return Math.min(snapshotCount - 1, Math.max(0, Math.trunc(index)));
}

export function isNexusReplaySpeed(value: number): value is NexusReplaySpeed {
  return NEXUS_REPLAY_SPEED_OPTIONS.some((option) => option.value === value);
}

export const useNexusReplayStore = create<NexusReplaySharedState>(
  (set, get) => ({
    currentIndex: 0,
    requestedIndex: 0,
    snapshotCount: NEXUS_REPLAY_SNAPSHOT_COUNT,
    timestamp: null,
    speed: 600,
    status: "idle",
    error: null,
    physicalControlEnabled: false,

    beginLoading: () => {
      set({
        status: "loading",
        error: null,
      });
    },

    acceptSnapshot: (index, timestamp, complete) => {
      const safeIndex = clampNexusReplayIndex(index, get().snapshotCount);

      set({
        currentIndex: safeIndex,
        requestedIndex: safeIndex,
        timestamp,
        status: complete
          ? "complete"
          : get().status === "playing"
            ? "playing"
            : "ready",
        error: null,
      });
    },

    setRequestedIndex: (index) => {
      set({
        requestedIndex: clampNexusReplayIndex(index, get().snapshotCount),
      });
    },

    setSpeed: (speed) => {
      if (!isNexusReplaySpeed(speed)) {
        return;
      }

      set({
        speed,
      });
    },

    play: () => {
      const state = get();

      if (state.status === "loading" || state.status === "error") {
        return;
      }

      set({
        status: "playing",
      });
    },

    pause: () => {
      const state = get();

      if (state.status === "playing") {
        set({
          status: "paused",
        });
      }
    },

    reset: () => {
      set({
        currentIndex: 0,
        requestedIndex: 0,
        timestamp: null,
        status: "idle",
        error: null,
      });
    },

    seek: (index) => {
      const state = get();

      const safeIndex = clampNexusReplayIndex(index, state.snapshotCount);

      set({
        currentIndex: safeIndex,
        requestedIndex: safeIndex,
        status: safeIndex === state.snapshotCount - 1 ? "complete" : "paused",
      });

      return safeIndex;
    },

    next: () => {
      const state = get();

      const nextIndex = clampNexusReplayIndex(
        state.currentIndex + 1,
        state.snapshotCount,
      );

      set({
        currentIndex: nextIndex,
        requestedIndex: nextIndex,
        status:
          nextIndex === state.snapshotCount - 1 ? "complete" : state.status,
      });

      return nextIndex;
    },

    previous: () => {
      const state = get();

      const previousIndex = clampNexusReplayIndex(
        state.currentIndex - 1,
        state.snapshotCount,
      );

      set({
        currentIndex: previousIndex,
        requestedIndex: previousIndex,
        status: state.status === "complete" ? "paused" : state.status,
      });

      return previousIndex;
    },

    fail: (message) => {
      set({
        status: "error",
        error: message,
      });
    },

    clearError: () => {
      set({
        error: null,
        status: get().timestamp === null ? "idle" : "ready",
      });
    },
  }),
);
