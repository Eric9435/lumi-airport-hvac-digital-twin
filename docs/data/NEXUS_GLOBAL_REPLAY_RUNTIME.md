# LUMI Nexus Global Replay Runtime

## Architecture

`NexusReplayRuntime` owns the automatic Nexus operational replay clock.

It is mounted exactly once inside `LumiGlobalRuntimes`, which is mounted
from the application root layout.

## Route Navigation

The runtime remains mounted while users navigate between Nexus domain
pages and the HVAC Dashboard.

Automatic replay therefore continues across route transitions.

## Replay Console

The Replay Console is a control and visualization surface.

It does not own the automatic replay timer.

The console resumes from the shared Zustand replay index and receives
synchronized snapshots published by the global runtime.

## Snapshot Distribution

Every synchronized snapshot is published using the browser event:

```text
lumi:nexus-replay-snapshot

Client-side domain adapters can subscribe to this event and the shared
Zustand state.

Safety Boundary

All replay data is simulated.

Physical equipment control remains disabled.

The runtime does not issue commands to PLC, DDC, BMS, HVAC, power,
safety or airport operational equipment.
```
