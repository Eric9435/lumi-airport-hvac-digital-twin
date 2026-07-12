import { describe, expect, it } from "vitest";

type ReplayStatus =
  "empty" | "ready" | "playing" | "paused" | "completed" | "error";

function runtimeEnabled(
  automaticControlEnabled: boolean,
  replayStatus: ReplayStatus,
): boolean {
  return automaticControlEnabled || replayStatus === "playing";
}

function replayIntervalMilliseconds(speed: number): number {
  return Math.max(100, 2000 / Math.max(0.25, speed));
}

describe("CSV replay control policy", () => {
  it("does not start when the app opens", () => {
    expect(runtimeEnabled(false, "empty")).toBe(false);
  });

  it("does not start after CSV load only", () => {
    expect(runtimeEnabled(false, "ready")).toBe(false);
  });

  it("starts only after Play Replay", () => {
    expect(runtimeEnabled(false, "playing")).toBe(true);
  });

  it("stops when replay is paused", () => {
    expect(runtimeEnabled(false, "paused")).toBe(false);
  });

  it("supports explicit automatic mode", () => {
    expect(runtimeEnabled(true, "empty")).toBe(true);
  });

  it("calculates replay speed intervals", () => {
    expect(replayIntervalMilliseconds(1)).toBe(2000);

    expect(replayIntervalMilliseconds(2)).toBe(1000);

    expect(replayIntervalMilliseconds(5)).toBe(400);

    expect(replayIntervalMilliseconds(20)).toBe(100);
  });
});
