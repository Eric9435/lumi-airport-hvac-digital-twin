# LUMI Airport HVAC Digital Twin

## Presentation layer

Next.js provides the animated digital-twin dashboard, plant views, analytics,
alarms, reports, maintenance workflows, and LUMI conversational interface.

## Runtime-state layer

Zustand will maintain responsive client-side state so commands and animations
can update without waiting for Google Sheets.

## Simulation layer

The virtual HVAC engine will model:

- Four water-cooled chillers
- Chilled-water pumps
- Condenser-water pumps
- Cooling towers
- Airport AHU zones
- Flight and passenger demand
- Energy consumption
- Equipment alarms
- Operating interlocks

## API layer

Next.js Route Handlers provide health checks, bootstrap data, simulation
commands, LUMI processing, and Google Apps Script synchronization.

## Persistent-data layer

Google Apps Script and Google Sheets store design data, flight schedules,
telemetry snapshots, commands, alarms, maintenance records, energy records,
reports, recommendations, and audit logs.

## Current operating mode

The project currently operates as a virtual simulation. It does not claim to
control physical HVAC equipment.
