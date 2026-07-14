"use client";

import { useSensorReplayStore } from "@/store/sensor-replay-store";

export default function LiveSensorMonitoringPanel() {
  const replay = useSensorReplayStore();

  const snapshot = replay.currentSnapshot;

  if (!snapshot) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
        No live sensor data available. Start CSV Replay to stream virtual
        sensors.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-white">
      <h2 className="text-xl font-bold">LUMI Live Sensor Monitoring</h2>

      <p className="mt-1 text-sm text-slate-400">
        Virtual real-time sensor stream from CSV replay
      </p>

      <div className="mt-8">
        <h3 className="text-lg font-bold">Chiller Plant Sensors</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Sensor name="CH-01 Status" value="RUNNING" />
          <Sensor
            name="CHWS Temperature"
            value={`${snapshot.chwSupplyTempC ?? 0} °C`}
          />
          <Sensor
            name="CHWR Temperature"
            value={`${snapshot.chwReturnTempC ?? 0} °C`}
          />
          <Sensor
            name="Cooling Load"
            value={`${snapshot.calculatedCoolingLoadKw ?? 0} kW`}
          />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold">Pump & Flow Sensors</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Sensor name="Primary Pump Status" value="ONLINE" />
          <Sensor name="CHW Flow" value="120 m³/h" />
          <Sensor name="Pump Speed" value="65 %" />
          <Sensor name="Pressure" value="250 kPa" />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold">AHU Sensor Network</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Sensor name="AHU Temperature" value="23.5 °C" />
          <Sensor name="Airflow" value="6500 CMH" />
          <Sensor name="CO₂" value="620 ppm" />
          <Sensor name="Filter DP" value="120 Pa" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Sensor
          name="Outdoor Temperature"
          value={`${snapshot.outdoorDryBulbC ?? 0} °C`}
        />

        <Sensor
          name="Outdoor RH"
          value={`${snapshot.outdoorRhPercent ?? 0} %`}
        />

        <Sensor
          name="Cooling Load"
          value={`${snapshot.calculatedCoolingLoadKw ?? 0} kW`}
        />

        <Sensor name="CHWS" value={`${snapshot.chwSupplyTempC ?? 0} °C`} />

        <Sensor name="CHWR" value={`${snapshot.chwReturnTempC ?? 0} °C`} />

        <Sensor
          name="AHU Demand"
          value={`${snapshot.ahuCoolingDemandPercent ?? 0} %`}
        />

        <Sensor name="Passengers" value={`${snapshot.passengerCount ?? 0}`} />

        <Sensor name="Sensor Status" value="ONLINE" />
      </div>
    </section>
  );
}

function Sensor({ name, value }: { name: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
      <p className="text-sm text-slate-400">{name}</p>

      <p className="mt-2 text-lg font-semibold text-cyan-400">{value}</p>
    </div>
  );
}
