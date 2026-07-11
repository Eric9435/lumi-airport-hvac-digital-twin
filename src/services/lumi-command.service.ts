import type { LumiCommand } from "@/types/hvac";

export function parseLumiCommand(input: string): LumiCommand {
  const normalized = input.trim().toUpperCase();

  const startChiller = normalized.match(/\bSTART\s+(CH-\d{2})\b/);

  if (startChiller) {
    return {
      action: "START_CHILLER",
      equipmentId: startChiller[1],
    };
  }

  const stopChiller = normalized.match(/\bSTOP\s+(CH-\d{2})\b/);

  if (stopChiller) {
    return {
      action: "STOP_CHILLER",
      equipmentId: stopChiller[1],
    };
  }

  const startAhu = normalized.match(/\bSTART\s+(AHU-\d{2})\b/);

  if (startAhu) {
    return {
      action: "START_AHU",
      equipmentId: startAhu[1],
    };
  }

  const stopAhu = normalized.match(/\bSTOP\s+(AHU-\d{2})\b/);

  if (stopAhu) {
    return {
      action: "STOP_AHU",
      equipmentId: stopAhu[1],
    };
  }

  const fanSpeed = normalized.match(
    /\b(?:SET|CHANGE)\s+(AHU-\d{2}).*?(?:FAN\s+SPEED\s+)?(?:TO\s+)?(\d{1,3})\s*%/,
  );

  if (fanSpeed) {
    return {
      action: "SET_AHU_FAN_SPEED",
      equipmentId: fanSpeed[1],
      value: Number(fanSpeed[2]),
    };
  }

  const setpoint = normalized.match(
    /\b(?:SET|CHANGE)\s+(AHU-\d{2}).*?(?:SETPOINT|TEMPERATURE).*?(\d{1,2}(?:\.\d+)?)\s*°?C?\b/,
  );

  if (setpoint) {
    return {
      action: "SET_AHU_SETPOINT",
      equipmentId: setpoint[1],
      value: Number(setpoint[2]),
    };
  }

  if (
    normalized.includes("PLANT STATUS") ||
    normalized.includes("SYSTEM STATUS") ||
    normalized.includes("PLANT OVERVIEW")
  ) {
    return {
      action: "SHOW_PLANT_STATUS",
    };
  }

  return {
    action: "UNKNOWN",
    originalText: input,
  };
}
