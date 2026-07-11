import { describe, expect, it } from "vitest";

import { parseLumiCommand } from "@/services/lumi-command.service";

describe("parseLumiCommand", () => {
  it("parses a chiller start command", () => {
    expect(parseLumiCommand("Start CH-02")).toEqual({
      action: "START_CHILLER",

      equipmentId: "CH-02",
    });
  });

  it("parses a chiller stop command", () => {
    expect(parseLumiCommand("Stop CH-03")).toEqual({
      action: "STOP_CHILLER",

      equipmentId: "CH-03",
    });
  });

  it("parses an AHU fan-speed command", () => {
    expect(parseLumiCommand("Set AHU-02 fan speed to 85%")).toEqual({
      action: "SET_AHU_FAN_SPEED",

      equipmentId: "AHU-02",

      value: 85,
    });
  });

  it("parses an AHU temperature setpoint command", () => {
    expect(parseLumiCommand("Set AHU-03 temperature to 22.5C")).toEqual({
      action: "SET_AHU_SETPOINT",

      equipmentId: "AHU-03",

      value: 22.5,
    });
  });

  it("parses a plant-status request", () => {
    expect(parseLumiCommand("Show plant status")).toEqual({
      action: "SHOW_PLANT_STATUS",
    });
  });

  it("returns UNKNOWN for unsupported input", () => {
    expect(parseLumiCommand("Do something unusual")).toEqual({
      action: "UNKNOWN",

      originalText: "Do something unusual",
    });
  });
});
