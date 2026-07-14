"use client";

import { useEquipmentFaultStore } from "@/store/equipment-fault-store";

export default function FaultImpactPanel() {
  const faults = useEquipmentFaultStore((s) => s.faults);

  return (
    <section className="rounded-xl border border-red-700 bg-slate-950 p-5 text-white">
      <h2 className="text-xl font-bold">Equipment Fault & Impact Analysis</h2>

      {faults.length === 0 ? (
        <p>No active equipment faults</p>
      ) : (
        faults.map((f) => (
          <div key={f.id} className="mt-3 rounded-lg bg-red-950 p-3">
            <b>{f.severity}</b>

            <p>{f.equipment}</p>

            <p>{f.message}</p>
          </div>
        ))
      )}
    </section>
  );
}
