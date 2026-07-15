import { beforeEach, describe, expect, it } from "vitest";

import {
  NEXUS_REPLAY_SPEED_OPTIONS,
  NEXUS_REPLAY_SNAPSHOT_COUNT,
  useNexusReplayStore,
} from "../../src/store/nexus-replay-store";

describe("LUMI Nexus shared replay store", () => {
  beforeEach(() => {
    useNexusReplayStore.setState({
      currentIndex: 0,
      requestedIndex: 0,
      snapshotCount: NEXUS_REPLAY_SNAPSHOT_COUNT,
      timestamp: null,
      speed: 600,
      status: "idle",
      error: null,
      physicalControlEnabled: false,
    });
  });

  it("starts with safe replay defaults", () => {
    const state = useNexusReplayStore.getState();

    expect(state.currentIndex).toBe(0);
    expect(state.requestedIndex).toBe(0);
    expect(state.snapshotCount).toBe(144);
    expect(state.speed).toBe(600);
    expect(state.status).toBe("idle");
    expect(state.timestamp).toBeNull();

    expect(state.physicalControlEnabled).toBe(false);
  });

  it("accepts synchronized snapshots", () => {
    useNexusReplayStore
      .getState()
      .acceptSnapshot(72, "2026-07-15T12:00:00.000Z", false);

    const state = useNexusReplayStore.getState();

    expect(state.currentIndex).toBe(72);
    expect(state.requestedIndex).toBe(72);

    expect(state.timestamp).toBe("2026-07-15T12:00:00.000Z");

    expect(state.status).toBe("ready");
  });

  it("supports play, pause and reset", () => {
    const store = useNexusReplayStore.getState();

    store.acceptSnapshot(10, "2026-07-15T01:40:00.000Z", false);

    useNexusReplayStore.getState().play();

    expect(useNexusReplayStore.getState().status).toBe("playing");

    useNexusReplayStore.getState().pause();

    expect(useNexusReplayStore.getState().status).toBe("paused");

    useNexusReplayStore.getState().reset();

    const resetState = useNexusReplayStore.getState();

    expect(resetState.currentIndex).toBe(0);
    expect(resetState.timestamp).toBeNull();
    expect(resetState.status).toBe("idle");
  });

  it("clamps replay seeks safely", () => {
    const store = useNexusReplayStore.getState();

    expect(store.seek(-100)).toBe(0);
    expect(store.seek(999)).toBe(143);

    expect(useNexusReplayStore.getState().status).toBe("complete");
  });

  it("moves between snapshots safely", () => {
    useNexusReplayStore.getState().seek(72);

    expect(useNexusReplayStore.getState().next()).toBe(73);

    expect(useNexusReplayStore.getState().previous()).toBe(72);
  });

  it("exposes all deterministic replay speed configurations", () => {
    expect(NEXUS_REPLAY_SPEED_OPTIONS.map((option) => option.value)).toEqual([
      60, 120, 600, 1200,
    ]);

    expect(NEXUS_REPLAY_SPEED_OPTIONS.map((option) => option.delayMs)).toEqual([
      10_000, 5_000, 1_000, 500,
    ]);
  });

  it("accepts supported replay speeds only", () => {
    useNexusReplayStore.getState().setSpeed(1200);

    expect(useNexusReplayStore.getState().speed).toBe(1200);
  });

  it("records replay failures", () => {
    useNexusReplayStore.getState().fail("Replay snapshot unavailable.");

    const state = useNexusReplayStore.getState();

    expect(state.status).toBe("error");

    expect(state.error).toBe("Replay snapshot unavailable.");
  });
});
