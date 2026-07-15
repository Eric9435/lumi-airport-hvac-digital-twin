import type { Metadata } from "next";
import Link from "next/link";

import { createFlightOperationsTwinSnapshot } from "@/nexus/flight-operations";

export const metadata: Metadata = {
  title: "Flight Operations Twin",
  description:
    "Airport flight operations, delay pressure, gate utilisation and cross-domain demand intelligence.",
};

export const dynamic = "force-dynamic";

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function indicatorClass(value: string): string {
  if (["critical", "cancelled"].includes(value)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (["high", "delayed"].includes(value)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["elevated", "boarding"].includes(value)) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default async function FlightOperationsTwinPage() {
  const snapshot = await createFlightOperationsTwinSnapshot();

  const cards = [
    {
      label: "Today's Flights",
      value: snapshot.totalFlights,
      detail: `${snapshot.arrivals} arrivals • ${snapshot.departures} departures`,
    },
    {
      label: "Delayed Flights",
      value: snapshot.delayedFlights,
      detail: `${formatNumber(
        snapshot.averageDelayMinutes,
        1,
      )} min average delay`,
    },
    {
      label: "Active Gates",
      value: snapshot.activeGates,
      detail: `${snapshot.cancelledFlights} cancelled`,
    },
    {
      label: "Estimated Passengers",
      value: formatNumber(snapshot.estimatedPassengers),
      detail: `${snapshot.highPressureFlights} high-pressure flights`,
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
                Flight Operations Twin
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Airport flight operations intelligence combining flight
                schedules, operational status, delays, gates, passenger demand
                and cross-domain HVAC and terminal pressure.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-300 uppercase">
                {snapshot.dataMode}
              </span>

              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-violet-300 uppercase">
                Simulation Safe
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
              href="/nexus/passenger-flow"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Passenger Flow Twin
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
                  Flight Operations Register
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Flights ordered by deterministic operational pressure.
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
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Flight</th>
                    <th className="px-3 py-3">Route</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Pressure</th>
                    <th className="px-3 py-3">Scheduled</th>
                    <th className="px-3 py-3">Estimated</th>
                    <th className="px-3 py-3">Delay</th>
                    <th className="px-3 py-3">Terminal</th>
                    <th className="px-3 py-3">Gate</th>
                    <th className="px-3 py-3">Passengers</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.flights.map((flight) => (
                    <tr
                      key={flight.flightId}
                      className="border-b border-slate-900"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-200">
                          {flight.flightNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {flight.airline}
                        </p>
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {flight.origin} → {flight.destination}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${indicatorClass(
                            flight.status,
                          )}`}
                        >
                          {flight.status}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${indicatorClass(
                            flight.pressureLevel,
                          )}`}
                        >
                          {flight.pressureLevel}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {flight.scheduledTime ?? "—"}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {flight.estimatedTime ?? "—"}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {flight.delayMinutes} min
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {flight.terminal ?? "—"}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {flight.gate ?? "—"}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(flight.estimatedPassengers)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {snapshot.flights.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-sm text-slate-400">
                  No flight records were returned by the current flight-data
                  provider.
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  The Flight Operations Twin remains available and will populate
                  when /api/flights/today returns flight records.
                </p>
              </div>
            )}
          </article>

          <div className="space-y-6">
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Cross-Domain Coupling
              </h2>

              <dl className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <dt className="text-sm text-slate-400">
                    Passenger demand context
                  </dt>
                  <dd
                    className={
                      snapshot.coupling.passengerFlowDemandAvailable
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }
                  >
                    {snapshot.coupling.passengerFlowDemandAvailable
                      ? "Available"
                      : "Foundation"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-slate-400">
                    HVAC demand coupling
                  </dt>
                  <dd
                    className={
                      snapshot.coupling.hvacDemandCouplingAvailable
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }
                  >
                    {snapshot.coupling.hvacDemandCouplingAvailable
                      ? "Available"
                      : "Foundation"}
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
                  <dt className="text-slate-400">Autonomous dispatch</dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Gate control</dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Human approval</dt>
                  <dd className="text-emerald-300">Required</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Pressure Summary
              </h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">High pressure</dt>
                  <dd className="text-amber-300">
                    {snapshot.highPressureFlights}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Critical pressure</dt>
                  <dd className="text-red-300">
                    {snapshot.criticalPressureFlights}
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          Flight Operations Twin is an engineering and operational
          decision-support layer. It does not replace official airline, airport
          operations, air-traffic-control, dispatch, gate-management or safety
          systems.
        </footer>
      </div>
    </main>
  );
}
