import type { Metadata } from "next";
import Link from "next/link";

import { createPassengerFlowTwinSnapshot } from "@/nexus/passenger-flow";

export const metadata: Metadata = {
  title: "Passenger Flow Twin",
  description:
    "Airport passenger occupancy, terminal demand, zone congestion and flow-intelligence dashboard.",
};

export const dynamic = "force-dynamic";

function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function flowClass(level: string): string {
  if (level === "critical") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (level === "high") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (level === "elevated") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default async function PassengerFlowTwinPage() {
  const snapshot = await createPassengerFlowTwinSnapshot();

  const cards = [
    {
      label: "Modeled Zones",
      value: snapshot.totalZones,
      detail: `${snapshot.supportingAssetCount} supporting assets`,
    },
    {
      label: "Estimated Passengers",
      value: formatNumber(snapshot.estimatedPassengers),
      detail: "Configured/model-derived occupancy",
    },
    {
      label: "Average Occupancy",
      value:
        snapshot.averageOccupancyPercent === null
          ? "—"
          : `${formatNumber(snapshot.averageOccupancyPercent, 1)}%`,
      detail: `${snapshot.highFlowZoneCount} high-flow zones`,
    },
    {
      label: "Arrival Rate",
      value: `${formatNumber(snapshot.estimatedArrivalRatePerHour)}/h`,
      detail: `${formatNumber(
        snapshot.estimatedDepartureRatePerHour,
      )}/h departures`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.32em] text-cyan-400 uppercase">
                LUMI Nexus Airport Operations Twin
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Passenger Flow Twin
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Cross-domain passenger-demand and congestion intelligence using
                terminal, zone, occupancy, HVAC and flight-context metadata.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
                Model Derived
              </span>

              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-violet-300 uppercase">
                Simulation Only
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/nexus"
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
            >
              Back to Nexus
            </Link>

            <Link
              href="/nexus/safety"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Safety Twin
            </Link>

            <Link
              href="/nexus/energy"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Energy Twin
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              HVAC Twin
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10"
            >
              <p className="text-sm text-slate-400">{card.label}</p>

              <p className="mt-2 text-3xl font-semibold text-white">
                {card.value}
              </p>

              <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Terminal and Zone Flow Register
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Passenger-flow estimates ordered by congestion level.
                </p>
              </div>

              <span className="text-xs text-slate-500">
                Updated{" "}
                {new Date(snapshot.generatedAt).toLocaleString("en-GB", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Zone</th>
                    <th className="px-3 py-3">Terminal</th>
                    <th className="px-3 py-3">Flow Level</th>
                    <th className="px-3 py-3">Occupancy</th>
                    <th className="px-3 py-3">Capacity</th>
                    <th className="px-3 py-3">Utilisation</th>
                    <th className="px-3 py-3">Arrivals</th>
                    <th className="px-3 py-3">Departures</th>
                    <th className="px-3 py-3">Source</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.zones.map((zone) => (
                    <tr
                      key={`${zone.terminalId}:${zone.zoneId}`}
                      className="border-b border-slate-900"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-200">
                          {zone.zoneName}
                        </p>

                        <p className="text-xs text-slate-500">{zone.zoneId}</p>
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {zone.terminalId}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${flowClass(
                            zone.flowLevel,
                          )}`}
                        >
                          {zone.flowLevel}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(zone.estimatedOccupancy)}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(zone.configuredCapacity)}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {zone.occupancyPercent === null
                          ? "—"
                          : `${formatNumber(zone.occupancyPercent, 1)}%`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(zone.estimatedArrivalRatePerHour)}
                        /h
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(zone.estimatedDepartureRatePerHour)}
                        /h
                      </td>

                      <td className="px-3 py-3 text-xs text-slate-500">
                        {zone.dataSource}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Capacity Overview
              </h2>

              <dl className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <dt className="text-sm text-slate-400">
                    Configured capacity
                  </dt>
                  <dd className="font-medium text-slate-200">
                    {formatNumber(snapshot.totalConfiguredCapacity)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <dt className="text-sm text-slate-400">High-flow zones</dt>
                  <dd className="font-medium text-amber-300">
                    {snapshot.highFlowZoneCount}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-slate-400">Critical zones</dt>
                  <dd className="font-medium text-red-300">
                    {snapshot.criticalFlowZoneCount}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Operational Control Policy
              </h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">
                    Autonomous passenger routing
                  </dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Gate control</dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">
                    Public announcement control
                  </dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Human approval</dt>
                  <dd className="text-emerald-300">Required</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          Passenger Flow Twin values are configured or model-derived estimates.
          They do not replace live passenger-counting systems, airport
          operational control, airline information, security procedures or
          authorised crowd-management decisions.
        </footer>
      </div>
    </main>
  );
}
