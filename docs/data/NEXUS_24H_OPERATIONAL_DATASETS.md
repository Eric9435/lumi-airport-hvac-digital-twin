# LUMI Nexus 24-Hour Operational Datasets

## Purpose

These datasets provide synchronized 24-hour operational input for the
LUMI Nexus airport infrastructure digital-twin platform.

The platform is not named after the underlying file format. CSV is the
current transport format used to supply deterministic operational data
to the simulation and replay environment.

## Time Model

- Date: 15 July 2026
- Time zone: UTC
- Start: 00:00
- Final snapshot: 23:50
- Interval: 10 minutes
- Snapshots per point: 144
- Data origin: simulated
- Physical control: disabled

## Existing HVAC Datasets

The existing HVAC datasets remain unchanged:

- `public/data/yia-ahu-environment-24h-10min.csv`
- `public/data/yia-equipment-condition-24h-10min.csv`
- `public/data/yia-alarm-events-24h.csv`

## New Nexus Datasets

| Dataset                                     | Purpose                                                    |
| ------------------------------------------- | ---------------------------------------------------------- |
| `yia-power-distribution-24h-10min.csv`      | Transformers, LV panels, MCCs, power quality and loading   |
| `yia-emergency-power-24h-10min.csv`         | Generators, ATS and UPS operational readiness              |
| `yia-energy-utilities-24h-10min.csv`        | Electricity, thermal energy, water, solar, battery and gas |
| `yia-safety-systems-24h-10min.csv`          | Fire, smoke, gas, leak and evacuation safety inputs        |
| `yia-passenger-flow-24h-10min.csv`          | Terminal occupancy, queues, movement and service demand    |
| `yia-flight-operations-24h-10min.csv`       | Flight, gate, delay, boarding and passenger context        |
| `yia-baggage-operations-24h-10min.csv`      | Conveyor, sorter, scanner and baggage throughput           |
| `yia-airport-environment-24h-10min.csv`     | Weather, air quality, solar radiation and rainfall         |
| `yia-building-infrastructure-24h-10min.csv` | Lifts, escalators, lighting, doors and drainage            |
| `yia-platform-health-24h-10min.csv`         | Edge gateways, PLC/DDC communication and platform health   |
| `dataset-manifest.csv`                      | Dataset inventory, interval and row-count metadata         |

## Important Classification

Every generated row includes a source classification such as
`source_mode=simulated`.

These values must not be represented as live measured field data.

## Expected Runtime Direction

The datasets are intended to feed one synchronized Nexus virtual clock:

```text
00:00 dataset snapshot
        ↓
Domain state update
        ↓
Asset registry update
        ↓
Energy and maintenance calculations
        ↓
Safety and operational event publication
        ↓
Nexus dashboard refresh
        ↓
00:10 dataset snapshot
        ↓
Continue until 23:50

The files are generated deterministically. Running the generator again
produces the same dataset values.
```
