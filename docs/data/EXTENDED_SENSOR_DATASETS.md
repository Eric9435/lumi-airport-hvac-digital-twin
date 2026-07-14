# LUMI Extended Sensor Datasets

## Core replay dataset

`public/data/yia-24h-10min.csv`

Contains airport demand, outdoor weather, building load, chilled-water
temperatures, AHU demand and the primary cooling-load replay inputs.

## AHU environment dataset

`public/data/yia-ahu-environment-24h-10min.csv`

Long-format AHU and zone data containing:

- temperature and setpoint
- relative humidity
- supply and return air temperature
- airflow and fan speed
- valve and damper positions
- filter differential pressure
- CO2 and PM2.5
- occupancy
- communication and sensor quality

## Equipment-condition dataset

`public/data/yia-equipment-condition-24h-10min.csv`

Long-format rotating-equipment condition data containing:

- status, load, power and motor current
- vibration
- bearing and motor-winding temperature
- current imbalance
- runtime and start count
- health score
- failure probability
- remaining useful life
- alarms and communication quality

## Alarm event dataset

`public/data/yia-alarm-events-24h.csv`

Event-based alarm history containing raised and cleared timestamps,
equipment, severity, acknowledgement and recommended action.

## Architecture

Raw CSV data should be parsed by dedicated adapters and combined into the
canonical industrial digital-twin snapshot. AI forecasts, RUL, health score
and optimization recommendations should normally be calculated outputs rather
than operator-entered raw sensor values.
