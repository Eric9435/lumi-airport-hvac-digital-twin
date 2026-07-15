# LUMI Nexus Cross-Domain Replay Analytics

## Purpose

Replay Analytics converts each synchronized operational snapshot into
cross-domain observability information.

The analytics layer is schema-tolerant. It inspects each registered
dataset without requiring every airport domain to use identical columns.

## API

```text
GET /api/nexus/replay/analytics

Returns analytics for snapshot index 0.

GET /api/nexus/replay/analytics?index=72

Returns analytics for the 12:00 UTC synchronized snapshot.

GET /api/nexus/replay/analytics?timestamp=2026-07-15T12:00:00Z

Returns analytics for the matching virtual timestamp.

Snapshot Analytics

Each response includes:

Replay index and timestamp
Replay progress
Dataset count
Total operational records
Total alert records
Alert percentage
Number of datasets containing alerts
Status distribution by domain
Numeric metric count
Minimum, maximum and average values
Numeric sample count
Alert Detection

The analytics engine recognizes common operational states such as:

Warning
Alarm
Fault
Failure
Critical
Emergency
Offline
Overload
Trip
Unhealthy

Boolean fields such as alarm_active, fault_active and
emergency_active are also evaluated.

Numeric Telemetry

Numeric fields are summarized automatically, excluding identifiers and
timestamps.

Examples include:

Power
Current
Voltage
Energy
Temperature
Pressure
Flow
Occupancy
Passenger count
Queue time
Utilization
Health metrics
Safety Boundary

Replay Analytics is observational only.

It does not:

Send control commands
Change replay datasets
Connect to PLCs or DDCs
Operate physical equipment
Present simulated information as measured live data
```

## Safety Boundary

Physical control is disabled.

Replay Analytics is observational only.

It does not:

- Send control commands
- Change replay datasets
- Connect to PLCs or DDCs
- Operate physical equipment
- Present simulated information as measured live data
