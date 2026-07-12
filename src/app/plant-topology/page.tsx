import Link from "next/link";

import { PlantTopologyMap } from "@/components/enterprise/plant-topology-map";

export default function PlantTopologyPage() {
  return (
    <>
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400 uppercase">
                LUMI Digital Twin
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Interactive Plant Topology
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Live electrical, chilled-water and condenser-water system
                mapping.
              </p>
            </div>

            <nav className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Dashboard
              </Link>
              <Link
                href="/plant-sequence"
                className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20"
              >
                Plant Sequence
              </Link>
            </nav>
          </header>

          <PlantTopologyMap />
        </div>
      </main>
    </>
  );
}
