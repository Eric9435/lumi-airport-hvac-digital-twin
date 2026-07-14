"use client";

import { useIndustrialSensorStore } from "@/store/industrial-sensor-store";

export default function AdvancedIndustrialSensorPanel() {
  const sensor = useIndustrialSensorStore();

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950 p-6 text-white">
      <h2 className="text-xl font-bold">
        Advanced Industrial Sensor Monitoring
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="font-semibold">Indoor Air Quality</h3>
          <p>CO₂: {sensor.iaq.co2Ppm} ppm</p>
          <p>Humidity: {sensor.iaq.humidityPercent}%</p>
          <p>PM2.5: {sensor.iaq.pm25} µg/m³</p>
          <p>Status: {sensor.iaq.airQualityIndex}</p>
        </div>

        <div>
          <h3 className="font-semibold">Pump</h3>
          <p>{sensor.pumps[0].id}</p>
          <p>Speed: {sensor.pumps[0].speedPercent}%</p>
          <p>Flow: {sensor.pumps[0].flowM3h} m³/h</p>
          <p>DP: {sensor.pumps[0].differentialPressureKpa} kPa</p>
        </div>

        <div>
          <h3 className="font-semibold">Cooling Tower</h3>
          <p>Fan: {sensor.coolingTower.fanSpeedPercent}%</p>
          <p>
            Water:
            {sensor.coolingTower.condenserSupplyTempC} →
            {sensor.coolingTower.condenserReturnTempC} °C
          </p>
        </div>
      </div>
    </section>
  );
}
