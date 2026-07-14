export function calculateCoolingImpact(running: number, required: number) {
  if (running < required) {
    return {
      severity: "CRITICAL",

      message: "Insufficient cooling capacity. Remaining chillers overloaded.",

      recommendation: "Start standby chiller or reduce cooling demand.",
    };
  }

  if (running === required) {
    return {
      severity: "WARNING",

      message: "No standby cooling capacity available.",

      recommendation: "Monitor plant reliability.",
    };
  }

  return {
    severity: "NORMAL",

    message: "Cooling capacity available.",

    recommendation: "Operation normal.",
  };
}
