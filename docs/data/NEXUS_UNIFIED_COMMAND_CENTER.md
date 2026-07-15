# LUMI Nexus Unified Command Center

## Purpose

The `/nexus` route is the unified live operational dashboard for the LUMI
Nexus airport infrastructure intelligence platform.

## Runtime Integration

The dashboard subscribes to the root-mounted `NexusReplayRuntime` through:

- Shared Zustand replay state
- The `lumi:nexus-replay-snapshot` browser event
- The synchronized replay analytics API

The dashboard does not create a second replay timer.

## Dashboard Capabilities

- Live replay timestamp, index, progress and speed
- Play, pause and reset controls
- Cross-domain runtime activity trend
- Alert timeline
- Domain alert distribution
- Primary numeric metric comparison
- Animated domain runtime topology
- Live domain intelligence table
- Runtime diagnostics
- Engineering safety status

## Domain Coverage

The dashboard recognizes:

- HVAC
- Power distribution
- Emergency power
- Energy and utilities
- Safety systems
- Passenger flow
- Flight operations
- Baggage operations
- Airport environment
- Building infrastructure
- Platform health

## Safety

The dashboard is a simulation and engineering decision-support surface.

Physical airport equipment control remains disabled.
