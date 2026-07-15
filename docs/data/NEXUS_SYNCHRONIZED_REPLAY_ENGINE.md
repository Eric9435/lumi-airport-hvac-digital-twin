# LUMI Nexus Synchronized Replay Engine

## Purpose

The synchronized replay engine reads all registered Nexus operational
datasets through one deterministic virtual timeline.

CSV remains the current transport format. The user-facing platform
capability is operational dataset replay.

## Runtime Model

| Property                       | Value          |
| ------------------------------ | -------------- |
| Platform                       | LUMI Nexus     |
| Runtime mode                   | Dataset replay |
| Data origin                    | Simulated      |
| Duration                       | 24 hours       |
| Interval                       | 10 minutes     |
| Snapshots                      | 144            |
| Datasets                       | 10             |
| Rows per synchronized snapshot | 89             |
| Physical control               | Disabled       |

## API

```text
GET /api/nexus/replay

Returns the first synchronized snapshot.

GET /api/nexus/replay?index=72

Returns replay snapshot 72, representing 12:00 UTC.

GET /api/nexus/replay?timestamp=2026-07-15T12:00:00Z

Returns the snapshot matching the supplied timestamp.

Snapshot Contents

Each response includes:

Current virtual timestamp
Replay index
Previous and next timestamps
Progress percentage
Completion status
Dataset count
Total rows in the snapshot
Domain-specific rows from every registered dataset
Simulated-source classification
Physical-control disabled status
Synchronized Domain Inputs

Every ten-minute snapshot combines:

Power distribution
Emergency power
Energy and utilities
Safety systems
Passenger flow
Flight operations
Baggage operations
Airport environment
Building infrastructure
Platform and edge health

Existing HVAC replay remains preserved in its current pipeline. A later
integration phase can adapt HVAC replay into the same Nexus virtual
clock without replacing the established HVAC simulation architecture.

Safety Boundary

This engine reads deterministic operational datasets only.

It does not:

Connect to field devices
Write PLC or DDC commands
Operate physical equipment
Claim that simulated values are measured data
```
