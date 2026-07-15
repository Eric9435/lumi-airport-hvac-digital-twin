# LUMI Nexus Dataset Runtime Contract

## Purpose

The Nexus Dataset Bundle Registry validates and exposes the synchronized
operational datasets used by the LUMI Nexus simulation environment.

The platform is not identified by the underlying CSV transport format.
The files are treated as operational dataset adapters.

## Runtime Classification

| Property                       | Value                     |
| ------------------------------ | ------------------------- |
| Platform                       | LUMI Nexus                |
| Runtime type                   | Dataset-driven simulation |
| Data origin                    | Simulated                 |
| Duration                       | 24 hours                  |
| Interval                       | 10 minutes                |
| Snapshots                      | 144                       |
| Physical equipment control     | Disabled                  |
| Real field protocol connection | Not included              |

## Dataset API

```text
GET /api/nexus/datasets

The API returns:

Bundle readiness
Dataset count
Valid dataset count
Total operational rows
Replay interval
Snapshot count
File existence
Expected and actual row counts
Timestamp coverage
Validation errors
Data-origin classification
Dataset Bundle

The manifest currently registers ten synchronized domain datasets:

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

Existing HVAC datasets remain part of the original HVAC simulation
pipeline and are not overwritten by this bundle registry.

Validation Rules

A dataset is ready only when:

The file exists
Its row count matches the manifest
Its first timestamp is present
Its final timestamp is present
The bundle interval is consistent
The snapshot count is consistent

A validation failure does not enable physical control or silently replace
missing data.
```
