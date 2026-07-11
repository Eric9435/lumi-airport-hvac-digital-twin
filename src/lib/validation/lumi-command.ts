import type { LumiCommand } from "@/types/hvac";

export interface CommandValidationResult {
  valid: boolean;
  message: string;
}

export function validateLumiCommand(
  command: LumiCommand,
): CommandValidationResult {
  if (command.action === "UNKNOWN") {
    return {
      valid: false,
      message: "The command could not be understood.",
    };
  }

  if (
    command.action === "SET_AHU_FAN_SPEED" &&
    (command.value < 0 || command.value > 100)
  ) {
    return {
      valid: false,
      message: "AHU fan speed must be between 0% and 100%.",
    };
  }

  if (
    command.action === "SET_AHU_SETPOINT" &&
    (command.value < 16 || command.value > 30)
  ) {
    return {
      valid: false,
      message: "AHU temperature setpoint must be between 16°C and 30°C.",
    };
  }

  return {
    valid: true,
    message: "Command validation passed.",
  };
}
