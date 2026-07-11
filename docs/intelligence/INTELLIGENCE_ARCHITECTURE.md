# Digital-Twin Intelligence Architecture

## Purpose

The intelligence layer converts virtual HVAC operating data into executive
KPIs, equipment health scores, reliability indicators and predictive
maintenance recommendations.

## Current implementation

The current system uses deterministic engineering rules and weighted scoring.
It does not claim to use a trained machine-learning failure model.

## Executive KPIs

- Plant performance score
- Asset performance index
- Energy-efficiency score
- Reliability score
- Comfort score
- Indoor-air-quality score
- Sustainability score
- Average chiller COP
- Plant availability
- Estimated MTBF
- Estimated MTTR
- Predicted maintenance count

## Equipment health

Equipment health is calculated from:

- Runtime
- Active alarm severity
- Efficiency
- Flow performance
- Temperature performance
- Filter differential pressure
- CO₂ concentration
- Cooling-tower approach
- Chiller COP
- Equipment availability

## Predictive maintenance

Predictive-maintenance recommendations include:

- Risk level
- Predicted issue
- Probability estimate
- Remaining useful life estimate
- Recommended completion period
- Supporting evidence
- Recommended action
- Operational impact

## Engineering limitation

Remaining useful life and failure probability are engineering estimates for
virtual demonstration. Real predictive maintenance requires validated
historical data, verified failure labels, condition-monitoring sensors and
model validation.
