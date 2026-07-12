import Link from "next/link";

import { SensorDataImportPanel } from "@/components/sensor-data/sensor-data-import-panel";
export default function SensorDataImportPage() {
  return (
    <>
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px] space-y-6">
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400 uppercase">
                LUMI Data Acquisition
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Sensor CSV Import
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Validate and replay a complete 24-hour airport HVAC sensor
                dataset at ten-minute intervals.
              </p>
            </div>

            <nav className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300"
              >
                Dashboard
              </Link>

              <Link
                href="/plant-sequence"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300"
              >
                Plant Sequence
              </Link>

              <Link
                href="/plant-topology"
                className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300"
              >
                Plant Topology
              </Link>
            </nav>
          </header>

          <SensorDataImportPanel />
        </div>
      </main>
    </>
  );
}
