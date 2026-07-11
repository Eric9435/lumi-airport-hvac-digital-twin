import { NextResponse } from "next/server";

import { appConfig } from "@/lib/config/app-config";

interface ReadinessCheck {
  name: string;
  status: "ready" | "optional" | "unavailable";
  details: string;
}

export async function GET() {
  const checks: ReadinessCheck[] = [
    {
      name: "application-runtime",

      status: "ready",

      details: "Next.js application runtime is available.",
    },

    {
      name: "simulation-engine",

      status: appConfig.simulationMode ? "ready" : "optional",

      details: appConfig.simulationMode
        ? "Virtual HVAC simulation mode is enabled."
        : "Virtual simulation mode is disabled.",
    },

    {
      name: "google-sheets",

      status: process.env.GOOGLE_APPS_SCRIPT_URL ? "ready" : "optional",

      details: process.env.GOOGLE_APPS_SCRIPT_URL
        ? "Google Apps Script endpoint is configured."
        : "Google Sheets integration is not configured; demo data remains available.",
    },

    {
      name: "openai",

      status: process.env.OPENAI_API_KEY ? "ready" : "optional",

      details: process.env.OPENAI_API_KEY
        ? "OpenAI integration is configured."
        : "External AI integration is not configured; rule-based LUMI intelligence remains available.",
    },
  ];

  const unavailableRequiredChecks = checks.filter(
    (check) => check.status === "unavailable",
  );

  const ready = unavailableRequiredChecks.length === 0;

  return NextResponse.json(
    {
      ready,

      service: appConfig.name,

      version: appConfig.version,

      mode: appConfig.simulationMode
        ? "virtual-simulation"
        : "external-integration",

      checks,

      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
    },
  );
}
