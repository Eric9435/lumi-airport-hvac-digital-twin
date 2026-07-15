# LUMI Nexus Shared Replay State

## Purpose

The shared replay store is the browser-side source of truth for the
LUMI Nexus synchronized operational timeline.

## State Authority

The store is implemented with Zustand and contains:

- Current snapshot index
- Requested timeline index
- Current virtual timestamp
- Replay status
- Replay speed
- Loading and error state
- Snapshot boundary
- Physical-control safety flag

## Runtime Actions

- Begin loading
- Accept a synchronized snapshot
- Play
- Pause
- Reset
- Seek
- Previous snapshot
- Next snapshot
- Change replay speed
- Record and clear failures

## Replay Boundary

All indexes are constrained to:

```text
0–143

The timeline represents:

24 operational hours
10-minute intervals
144 synchronized snapshots
Safety Boundary

The shared state controls simulated browser replay only.

Physical equipment control remains disabled.

The store does not send commands to:

PLC controllers
DDC controllers
BMS field devices
HVAC equipment
Power equipment
Safety systems
```
