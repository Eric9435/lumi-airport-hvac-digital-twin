# LUMI Airport HVAC Digital Twin

A virtual airport HVAC platform that combines plant simulation, equipment dashboards, flight/passenger demand, alarms, energy analysis, and maintenance workflows.

**Operating mode: virtual simulation.** This project does not establish physical HVAC control or a calibrated model of a particular airport.

## Features

- Chiller, chilled-water/condenser-water pump, cooling-tower, and AHU-zone models.
- Flight/passenger-driven demand and time-step simulation.
- Plant/equipment views, trends, energy summaries, and alarms.
- Scenario commands, maintenance work orders, reports, and audit routes.
- LUMI analysis/command interface.
- Optional Google Apps Script/Sheets persistence and AI configuration.
- Health, readiness, and version API endpoints.

## Stack

Next.js 16, React 19, TypeScript, Zustand, Recharts, Zod, Tailwind CSS, and Vitest. Docker and GitHub Actions configuration are included.

## Local development

Use Node.js 22 or newer and npm:

```bash
git clone https://github.com/Eric9435/lumi-airport-hvac-digital-twin.git
cd lumi-airport-hvac-digital-twin
npm ci
cp .env.example .env.local
```

Set a unique `SESSION_SECRET` and replace the example initial-admin credentials in `.env.local`. Configure optional Google Apps Script and OpenAI values only when using those integrations.

```bash
npm run dev
```

Open http://localhost:3000.

## Verification and build

```bash
npm run validate
```

This script runs TypeScript checks, ESLint, Vitest, and a production build. `npm run ci:check` additionally checks formatting. These commands describe available checks; no fresh runtime verification is claimed by this documentation update.

After a successful build, run `npm run start`. Check `/api/health`, `/api/system/readiness`, and `/api/system/version` on the local server.

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/app/` | UI routes and API handlers |
| `src/lib/simulation/` | Initial state, calculations, and tick engine |
| `docs/architecture/` | System and data-flow design |
| `docs/google-apps-script/` | Apps Script source and sheet structure |
| `docs/security/` | Security and access model |
| `docs/operations/` | Operational runbook |
| `docs/testing/` | Testing strategy |

## Configuration and limits

External integrations require your own endpoints and credentials. Simulation dynamics and risk calculations include heuristics and should be validated against reference cases before engineering decisions. Production deployment needs credential review, access controls, persistence, backups, and commissioning appropriate to the intended environment.

See the [system architecture](docs/architecture/SYSTEM_ARCHITECTURE.md), [operations runbook](docs/operations/RUNBOOK.md), and [testing strategy](docs/testing/TESTING_STRATEGY.md).

## Maintainer

[Aung Phone Myat (Eric)](https://github.com/Eric9435)
