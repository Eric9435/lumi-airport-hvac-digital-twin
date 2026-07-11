#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 10 FAILED"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "${PROJECT_ROOT}"

required_files=(
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "src/app/layout.tsx"
  "src/app/page.tsx"
  "src/services/lumi-command.service.ts"
  "src/lib/energy/energy-engine.ts"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "ERROR: Required file was not found: ${file}" >&2
    exit 1
  fi
done

echo "============================================================"
echo "PART 10 — PRODUCTION HARDENING, TESTING, CI/CD AND DOCKER"
echo "============================================================"

echo "Installing professional testing dependencies..."

npm install --save-dev \
  vitest \
  @vitest/coverage-v8 \
  jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event

mkdir -p \
  .github/workflows \
  src/app/api/system/readiness \
  src/app/api/system/version \
  src/app/error-boundary \
  src/lib/monitoring \
  src/lib/security \
  src/lib/testing \
  tests/unit \
  tests/integration \
  docs/deployment \
  docs/operations \
  docker

echo "Configuring package scripts safely..."

node <<'NODE'
const fs = require("fs");

const packagePath = "package.json";
const packageJson = JSON.parse(
  fs.readFileSync(packagePath, "utf8"),
);

packageJson.scripts = {
  ...packageJson.scripts,

  dev: "next dev --turbopack",
  build: "next build",
  start: "next start",
  lint: "eslint .",
  typecheck: "tsc --noEmit",
  format: "prettier --write .",
  "format:check": "prettier --check .",

  test: "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",

  validate:
    "npm run typecheck && npm run lint && npm run test && npm run build",

  "ci:check":
    "npm run format:check && npm run typecheck && npm run lint && npm run test && npm run build",

  "docker:build":
    "docker build -t lumi-airport-hvac-digital-twin .",

  "docker:run":
    "docker run --rm -p 3000:3000 --env-file .env.local lumi-airport-hvac-digital-twin"
};

fs.writeFileSync(
  packagePath,
  JSON.stringify(packageJson, null, 2) + "\n",
);

console.log("package.json scripts configured successfully.");
NODE

echo "Creating Vitest configuration..."

cat > vitest.config.ts <<'EOF'
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(
        new URL("./src", import.meta.url),
      ),
    },
  },

  test: {
    environment: "node",

    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
    ],

    exclude: [
      "node_modules",
      ".next",
      "coverage",
    ],

    coverage: {
      provider: "v8",

      reporter: [
        "text",
        "json",
        "html",
      ],

      reportsDirectory: "coverage",

      include: [
        "src/lib/**/*.ts",
        "src/services/**/*.ts",
      ],

      exclude: [
        "src/**/*.d.ts",
      ],

      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
});
EOF

echo "Creating LUMI command parser unit tests..."

cat > tests/unit/lumi-command.service.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseLumiCommand,
} from "@/services/lumi-command.service";

describe(
  "parseLumiCommand",
  () => {
    it(
      "parses a chiller start command",
      () => {
        expect(
          parseLumiCommand(
            "Start CH-02",
          ),
        ).toEqual({
          action:
            "START_CHILLER",

          equipmentId:
            "CH-02",
        });
      },
    );

    it(
      "parses a chiller stop command",
      () => {
        expect(
          parseLumiCommand(
            "Stop CH-03",
          ),
        ).toEqual({
          action:
            "STOP_CHILLER",

          equipmentId:
            "CH-03",
        });
      },
    );

    it(
      "parses an AHU fan-speed command",
      () => {
        expect(
          parseLumiCommand(
            "Set AHU-02 fan speed to 85%",
          ),
        ).toEqual({
          action:
            "SET_AHU_FAN_SPEED",

          equipmentId:
            "AHU-02",

          value: 85,
        });
      },
    );

    it(
      "parses an AHU temperature setpoint command",
      () => {
        expect(
          parseLumiCommand(
            "Set AHU-03 temperature to 22.5C",
          ),
        ).toEqual({
          action:
            "SET_AHU_SETPOINT",

          equipmentId:
            "AHU-03",

          value: 22.5,
        });
      },
    );

    it(
      "parses a plant-status request",
      () => {
        expect(
          parseLumiCommand(
            "Show plant status",
          ),
        ).toEqual({
          action:
            "SHOW_PLANT_STATUS",
        });
      },
    );

    it(
      "returns UNKNOWN for unsupported input",
      () => {
        expect(
          parseLumiCommand(
            "Do something unusual",
          ),
        ).toEqual({
          action:
            "UNKNOWN",

          originalText:
            "Do something unusual",
        });
      },
    );
  },
);
EOF

echo "Creating energy-engine unit tests..."

cat > tests/unit/energy-engine.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateEnergySample,
  calculateEnergySummary,
} from "@/lib/energy/energy-engine";

import {
  initialPlantState,
} from "@/lib/simulation/initial-state";

describe(
  "energy engine",
  () => {
    it(
      "calculates a positive energy sample",
      () => {
        const sample =
          calculateEnergySample(
            initialPlantState,
            60,
            0,
          );

        expect(
          sample.totalPowerKw,
        ).toBeGreaterThan(0);

        expect(
          sample.intervalEnergyKwh,
        ).toBeGreaterThan(0);

        expect(
          sample.cumulativeEnergyKwh,
        ).toBe(
          sample.intervalEnergyKwh,
        );
      },
    );

    it(
      "calculates an empty energy summary",
      () => {
        expect(
          calculateEnergySummary([]),
        ).toEqual({
          currentPowerKw: 0,
          totalEnergyKwh: 0,
          peakPowerKw: 0,
          averagePowerKw: 0,
          estimatedBaselineKwh: 0,
          estimatedSavingKwh: 0,
          estimatedSavingPercent: 0,
          estimatedCarbonKg: 0,
        });
      },
    );

    it(
      "calculates peak and average power",
      () => {
        const summary =
          calculateEnergySummary([
            {
              timestamp:
                "2026-07-11T09:00:00.000Z",
              totalPowerKw: 20,
              chillerPowerKw: 10,
              ahuPowerKw: 5,
              pumpPowerKw: 3,
              coolingTowerPowerKw: 2,
              intervalEnergyKwh: 1,
              cumulativeEnergyKwh: 1,
              expectedPassengers: 500,
            },
            {
              timestamp:
                "2026-07-11T09:05:00.000Z",
              totalPowerKw: 30,
              chillerPowerKw: 15,
              ahuPowerKw: 8,
              pumpPowerKw: 4,
              coolingTowerPowerKw: 3,
              intervalEnergyKwh: 1.5,
              cumulativeEnergyKwh: 2.5,
              expectedPassengers: 800,
            },
          ]);

        expect(
          summary.currentPowerKw,
        ).toBe(30);

        expect(
          summary.peakPowerKw,
        ).toBe(30);

        expect(
          summary.averagePowerKw,
        ).toBe(25);

        expect(
          summary.totalEnergyKwh,
        ).toBe(2.5);
      },
    );
  },
);
EOF

echo "Creating scenario-engine unit tests..."

cat > tests/unit/scenario-engine.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  simulationScenarios,
} from "@/data/demo/simulation-scenarios";

import {
  applyScenario,
} from "@/lib/scenarios/scenario-engine";

import {
  initialPlantState,
} from "@/lib/simulation/initial-state";

describe(
  "simulation scenario engine",
  () => {
    it(
      "applies the peak-departure scenario",
      () => {
        const scenario =
          simulationScenarios.find(
            (item) =>
              item.scenarioId ===
              "SCN-PEAK-DEPARTURE",
          );

        expect(
          scenario,
        ).toBeDefined();

        const result =
          applyScenario(
            initialPlantState,
            scenario!,
          );

        expect(
          result.operatingMode,
        ).toBe("boost");

        expect(
          result.expectedPassengers,
        ).toBeGreaterThan(
          initialPlantState
            .expectedPassengers,
        );

        const departureAhu =
          result.ahus.find(
            (ahu) =>
              ahu.id === "AHU-02",
          );

        expect(
          departureAhu?.mode,
        ).toBe("boost");
      },
    );

    it(
      "injects a lead-chiller failure",
      () => {
        const scenario =
          simulationScenarios.find(
            (item) =>
              item.scenarioId ===
              "SCN-CHILLER-FAILURE",
          );

        expect(
          scenario,
        ).toBeDefined();

        const result =
          applyScenario(
            initialPlantState,
            scenario!,
          );

        const failedChiller =
          result.chillers.find(
            (chiller) =>
              chiller.id === "CH-01",
          );

        expect(
          failedChiller?.status,
        ).toBe("alarm");

        expect(
          failedChiller?.alarmCode,
        ).toBe("CHILLER_TRIP");

        expect(
          failedChiller?.powerKw,
        ).toBe(0);
      },
    );
  },
);
EOF

echo "Creating health endpoint integration test..."

cat > tests/integration/health-route.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  GET,
} from "@/app/api/health/route";

describe(
  "GET /api/health",
  () => {
    it(
      "returns a healthy response",
      async () => {
        const response =
          await GET();

        const body =
          (await response.json()) as {
            status: string;
            service: string;
            version: string;
            timestamp: string;
          };

        expect(
          response.status,
        ).toBe(200);

        expect(
          body.status,
        ).toBe("ok");

        expect(
          body.service,
        ).toContain("LUMI");

        expect(
          body.timestamp,
        ).toBeTruthy();
      },
    );
  },
);
EOF

echo "Creating readiness API..."

cat > src/app/api/system/readiness/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  appConfig,
} from "@/lib/config/app-config";

interface ReadinessCheck {
  name: string;
  status:
    | "ready"
    | "optional"
    | "unavailable";
  details: string;
}

export async function GET() {
  const checks:
    ReadinessCheck[] = [
    {
      name:
        "application-runtime",

      status: "ready",

      details:
        "Next.js application runtime is available.",
    },

    {
      name:
        "simulation-engine",

      status:
        appConfig.simulationMode
          ? "ready"
          : "optional",

      details:
        appConfig.simulationMode
          ? "Virtual HVAC simulation mode is enabled."
          : "Virtual simulation mode is disabled.",
    },

    {
      name:
        "google-sheets",

      status:
        process.env
          .GOOGLE_APPS_SCRIPT_URL
          ? "ready"
          : "optional",

      details:
        process.env
          .GOOGLE_APPS_SCRIPT_URL
          ? "Google Apps Script endpoint is configured."
          : "Google Sheets integration is not configured; demo data remains available.",
    },

    {
      name:
        "openai",

      status:
        process.env.OPENAI_API_KEY
          ? "ready"
          : "optional",

      details:
        process.env.OPENAI_API_KEY
          ? "OpenAI integration is configured."
          : "External AI integration is not configured; rule-based LUMI intelligence remains available.",
    },
  ];

  const unavailableRequiredChecks =
    checks.filter(
      (check) =>
        check.status ===
        "unavailable",
    );

  const ready =
    unavailableRequiredChecks.length === 0;

  return NextResponse.json(
    {
      ready,

      service:
        appConfig.name,

      version:
        appConfig.version,

      mode:
        appConfig.simulationMode
          ? "virtual-simulation"
          : "external-integration",

      checks,

      timestamp:
        new Date().toISOString(),
    },
    {
      status:
        ready ? 200 : 503,
    },
  );
}
EOF

echo "Creating version API..."

cat > src/app/api/system/version/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  appConfig,
} from "@/lib/config/app-config";

export async function GET() {
  return NextResponse.json({
    application:
      appConfig.name,

    version:
      appConfig.version,

    runtime:
      process.version,

    environment:
      process.env.NODE_ENV,

    commit:
      process.env
        .NEXT_PUBLIC_GIT_COMMIT ??
      "development",

    timestamp:
      new Date().toISOString(),
  });
}
EOF

echo "Creating structured application logger..."

cat > src/lib/monitoring/logger.ts <<'EOF'
export type LogLevel =
  | "debug"
  | "info"
  | "warn"
  | "error";

export interface LogContext {
  module?: string;
  action?: string;
  requestId?: string;
  equipmentId?: string;
  userId?: string;
  [key: string]: unknown;
}

function serializeError(
  error: unknown,
): unknown {
  if (
    error instanceof Error
  ) {
    return {
      name: error.name,
      message:
        error.message,
      stack:
        process.env.NODE_ENV ===
        "development"
          ? error.stack
          : undefined,
    };
  }

  return error;
}

function writeLog(
  level: LogLevel,
  message: string,
  context: LogContext = {},
  error?: unknown,
): void {
  const record = {
    timestamp:
      new Date().toISOString(),

    level,

    message,

    context,

    error:
      error === undefined
        ? undefined
        : serializeError(error),
  };

  const output =
    JSON.stringify(record);

  switch (level) {
    case "error":
      console.error(output);
      break;

    case "warn":
      console.warn(output);
      break;

    case "debug":
      if (
        process.env.LOG_LEVEL ===
          "debug" ||
        process.env.NODE_ENV ===
          "development"
      ) {
        console.debug(output);
      }
      break;

    default:
      console.info(output);
  }
}

export const logger = {
  debug(
    message: string,
    context?: LogContext,
  ) {
    writeLog(
      "debug",
      message,
      context,
    );
  },

  info(
    message: string,
    context?: LogContext,
  ) {
    writeLog(
      "info",
      message,
      context,
    );
  },

  warn(
    message: string,
    context?: LogContext,
  ) {
    writeLog(
      "warn",
      message,
      context,
    );
  },

  error(
    message: string,
    error?: unknown,
    context?: LogContext,
  ) {
    writeLog(
      "error",
      message,
      context,
      error,
    );
  },
};
EOF

echo "Creating application error boundary..."

cat > src/app/error.tsx <<'EOF'
"use client";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import {
  useEffect,
} from "react";

interface GlobalErrorProps {
  error:
    Error & {
      digest?: string;
    };

  reset: () => void;
}

export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps) {
  useEffect(() => {
    console.error(
      "Application error:",
      error,
    );
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
          <AlertTriangle
            size={32}
            className="text-red-300"
          />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-white">
          Digital Twin Runtime Error
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          The application encountered an unexpected error.
          The virtual HVAC system has not issued any physical
          control command.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-slate-600">
            Reference: {error.digest}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
        >
          <RefreshCw size={16} />
          Retry application
        </button>
      </section>
    </main>
  );
}
EOF

echo "Creating loading interface..."

cat > src/app/loading.tsx <<'EOF'
import {
  LoaderCircle,
} from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="text-center">
        <LoaderCircle
          size={38}
          className="mx-auto animate-spin text-cyan-300"
        />

        <p className="mt-4 text-sm text-slate-400">
          Initializing LUMI Airport HVAC Digital Twin...
        </p>
      </div>
    </main>
  );
}
EOF

echo "Creating professional not-found page..."

cat > src/app/not-found.tsx <<'EOF'
import Link from "next/link";

import {
  ArrowLeft,
  SearchX,
} from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <SearchX
          size={42}
          className="mx-auto text-slate-500"
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
          Error 404
        </p>

        <h1 className="mt-3 text-2xl font-semibold text-white">
          Page Not Found
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          The requested digital-twin module does not exist.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
        >
          <ArrowLeft size={16} />
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
EOF

echo "Creating production Next.js configuration..."

if [[ -f next.config.ts ]]; then
  cp next.config.ts next.config.ts.backup
fi

cat > next.config.ts <<'EOF'
import type {
  NextConfig,
} from "next";

const securityHeaders = [
  {
    key:
      "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key:
      "X-Frame-Options",
    value: "DENY",
  },
  {
    key:
      "Referrer-Policy",
    value:
      "strict-origin-when-cross-origin",
  },
  {
    key:
      "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=()",
  },
  {
    key:
      "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig:
  NextConfig = {
  output: "standalone",

  poweredByHeader: false,

  reactStrictMode: true,

  compress: true,

  async headers() {
    return [
      {
        source:
          "/:path*",

        headers:
          securityHeaders,
      },
    ];
  },
};

export default nextConfig;
EOF

echo "Creating Dockerfile..."

cat > Dockerfile <<'EOF'
FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

FROM base AS dependencies

COPY package.json package-lock.json ./

RUN npm ci

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public

COPY --from=builder \
  --chown=nextjs:nodejs \
  /app/.next/standalone ./

COPY --from=builder \
  --chown=nextjs:nodejs \
  /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=20s \
  --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
EOF

echo "Creating Docker ignore file..."

cat > .dockerignore <<'EOF'
.git
.github
.next
node_modules
coverage
playwright-report
test-results
logs
exports
.env
.env.local
.env.development
.env.production
*.log
Dockerfile*
README.md
docs
tests
scripts
EOF

echo "Creating Docker Compose development definition..."

cat > docker-compose.yml <<'EOF'
services:
  lumi-digital-twin:
    build:
      context: .
      dockerfile: Dockerfile

    container_name:
      lumi-airport-hvac-digital-twin

    restart:
      unless-stopped

    ports:
      - "3000:3000"

    environment:
      NODE_ENV: production
      NEXT_PUBLIC_APP_NAME: LUMI Airport HVAC Digital Twin
      NEXT_PUBLIC_APP_VERSION: 0.1.0
      NEXT_PUBLIC_SIMULATION_MODE: "true"
      NEXT_PUBLIC_SIMULATION_TICK_MS: "1000"
      NEXT_PUBLIC_SNAPSHOT_INTERVAL_MS: "60000"
      NEXT_PUBLIC_ENABLE_ANIMATIONS: "true"
      NEXT_PUBLIC_ENABLE_SOUND: "false"
      NEXT_PUBLIC_ENABLE_LUMI: "true"
      GOOGLE_APPS_SCRIPT_URL: ${GOOGLE_APPS_SCRIPT_URL:-}
      GOOGLE_APPS_SCRIPT_API_KEY: ${GOOGLE_APPS_SCRIPT_API_KEY:-}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      OPENAI_MODEL: ${OPENAI_MODEL:-}
      LOG_LEVEL: ${LOG_LEVEL:-info}

    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
        ]

      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
EOF

echo "Creating GitHub Actions CI workflow..."

cat > .github/workflows/ci.yml <<'EOF'
name: LUMI Digital Twin CI

on:
  push:
    branches:
      - main

  pull_request:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: >
    ci-${{ github.workflow }}-${{ github.ref }}

  cancel-in-progress: true

jobs:
  validate:
    name: Validate application

    runs-on: ubuntu-latest

    timeout-minutes: 20

    strategy:
      matrix:
        node-version:
          - "22"

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure Node.js
        uses: actions/setup-node@v4

        with:
          node-version: >
            ${{ matrix.node-version }}

          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run format:check

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit and integration tests
        run: npm run test

      - name: Production build
        run: npm run build

      - name: Upload coverage
        if: always()

        uses: actions/upload-artifact@v4

        with:
          name: test-results
          path: |
            coverage
          if-no-files-found: ignore
          retention-days: 7

  docker:
    name: Validate Docker image

    runs-on: ubuntu-latest

    timeout-minutes: 20

    needs:
      - validate

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build production image
        run: >
          docker build
          --tag lumi-airport-hvac-digital-twin:ci
          .
EOF

echo "Creating dependency-review workflow..."

cat > .github/workflows/dependency-review.yml <<'EOF'
name: Dependency Review

on:
  pull_request:

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Review dependency changes
        uses: actions/dependency-review-action@v4

        with:
          fail-on-severity: high
EOF

echo "Creating production verification script..."

cat > scripts/verify-production.sh <<'EOF'
#!/usr/bin/env bash

set -Eeuo pipefail

required_files=(
  "package.json"
  "package-lock.json"
  "next.config.ts"
  "Dockerfile"
  ".dockerignore"
  "docker-compose.yml"
  "vitest.config.ts"
  ".github/workflows/ci.yml"
  "src/app/error.tsx"
  "src/app/loading.tsx"
  "src/app/not-found.tsx"
  "src/app/api/system/readiness/route.ts"
  "src/app/api/system/version/route.ts"
  "src/lib/monitoring/logger.ts"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "Missing production file: ${file}" >&2
    exit 1
  fi
done

echo "Production file verification passed."
EOF

chmod +x scripts/verify-production.sh

echo "Creating deployment documentation..."

cat > docs/deployment/DEPLOYMENT.md <<'EOF'
# Production Deployment

## Required environment

- Node.js 22 or newer
- npm
- Optional Docker environment
- Optional Google Apps Script endpoint
- Optional OpenAI API configuration

## Native deployment

```bash
npm ci
npm run validate
npm run build
npm run start

The production server listens on port 3000 by default.

Docker deployment

Build the image:

docker build \
  -t lumi-airport-hvac-digital-twin .

Run the container:

docker run \
  --rm \
  --name lumi-airport-hvac-digital-twin \
  --env-file .env.local \
  -p 3000:3000 \
  lumi-airport-hvac-digital-twin
Docker Compose
docker compose up \
  --build \
  --detach
Health endpoints
GET /api/health
GET /api/system/readiness
GET /api/system/version
Operating statement

The current deployment operates as a virtual HVAC simulation and digital-twin
platform. It does not directly control physical HVAC equipment.
EOF

cat > docs/operations/RUNBOOK.md <<'EOF'

Operational Runbook
Application fails to start

Run:

npm run typecheck
npm run lint
npm run test
npm run build

Review the first failing command before proceeding.

Health check fails

Check:

/api/health
/api/system/readiness

Verify that the application process is running and port 3000 is available.

Google Sheets is unavailable

The application should continue using demo flight data and local virtual state.

Verify:

GOOGLE_APPS_SCRIPT_URL
GOOGLE_APPS_SCRIPT_API_KEY
Simulation behaves unexpectedly

Use the dashboard reset control or reload the initial state.

Review:

Current operating mode
Applied simulation scenario
Manual AHU overrides
Running chiller count
Active alarms
Passenger demand
Production incident principle

This platform is currently a virtual simulation. A software failure must not be
represented as a failure of physical airport HVAC equipment.
EOF

echo "Updating .gitignore..."

cat >> .gitignore <<'EOF'

Test coverage

coverage/

Docker override

docker-compose.override.yml

Next.js configuration backup

next.config.ts.backup
EOF

echo "Formatting production files..."

npx prettier --write
package.json
vitest.config.ts
next.config.ts
src/app/error.tsx
src/app/loading.tsx
src/app/not-found.tsx
src/app/api/system/readiness/route.ts
src/app/api/system/version/route.ts
src/lib/monitoring/logger.ts
tests/unit/lumi-command.service.test.ts
tests/unit/energy-engine.test.ts
tests/unit/scenario-engine.test.ts
tests/integration/health-route.test.ts
.github/workflows/ci.yml
.github/workflows/dependency-review.yml
docker-compose.yml
docs/deployment/DEPLOYMENT.md
docs/operations/RUNBOOK.md

echo "Verifying production files..."

./scripts/verify-production.sh

echo "Running TypeScript validation..."

npm run typecheck

echo "Running ESLint..."

npm run lint

echo "Running automated tests..."

npm run test

echo "Running production build..."

npm run build

echo "Staging Part 10 changes..."

git add
package.json
package-lock.json
vitest.config.ts
next.config.ts
Dockerfile
.dockerignore
docker-compose.yml
.gitignore
.github/workflows/ci.yml
.github/workflows/dependency-review.yml
scripts/10-production-hardening-ci-and-docker.sh
scripts/verify-production.sh
src/app/error.tsx
src/app/loading.tsx
src/app/not-found.tsx
src/app/api/system/readiness/route.ts
src/app/api/system/version/route.ts
src/lib/monitoring/logger.ts
tests/unit/lumi-command.service.test.ts
tests/unit/energy-engine.test.ts
tests/unit/scenario-engine.test.ts
tests/integration/health-route.test.ts
docs/deployment/DEPLOYMENT.md
docs/operations/RUNBOOK.md

if git diff --cached --quiet; then
echo "No new Part 10 changes to commit."
else
git commit
-m "chore: add production hardening tests CI and Docker deployment"

git push
fi

echo
echo "============================================================"
echo "PART 10 COMPLETED SUCCESSFULLY"
echo "PRODUCTION HARDENING AND CI/CD ARE READY"
echo "============================================================"
echo
echo "Validation:"
echo " npm run validate"
echo
echo "Automated tests:"
echo " npm run test"
echo
echo "Coverage:"
echo " npm run test:coverage"
echo
echo "Development:"
echo " npm run dev"
echo
echo "Production:"
echo " npm run build"
echo " npm run start"
echo
echo "Docker:"
echo " npm run docker:build"
echo " npm run docker:run"
echo
echo "Health endpoints:"
echo " GET /api/health"
echo " GET /api/system/readiness"
echo " GET /api/system/version"
echo
