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
