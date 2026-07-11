"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Plane,
  RefreshCw,
  Users,
} from "lucide-react";

import { useFlightSchedule } from "@/hooks/use-flight-schedule";

function statusClass(status: string): string {
  switch (status) {
    case "boarding":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";

    case "delayed":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";

    case "cancelled":
      return "border-red-500/40 bg-red-500/10 text-red-300";

    case "arrived":
    case "departed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-300";
  }
}

export function FlightSchedulePanel() {
  const { loading, error, source, expectedPassengers, flights, reload } =
    useFlightSchedule();

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Plane size={20} className="text-cyan-300" />

            <h2 className="text-lg font-semibold text-white">
              Today&apos;s Flight Operations
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Flight-aware HVAC demand context
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
            <p className="text-xs text-slate-500">Expected passengers</p>

            <p className="font-semibold text-white">
              {expectedPassengers.toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Reload flights"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="p-5">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!error && loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading flight schedule...
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                Source:{" "}
                {source === "google-sheets" ? "Google Sheets" : "Demo dataset"}
              </span>

              <span>{flights.length} flights</span>
            </div>

            <div className="space-y-3">
              {flights.map((flight) => {
                const departure = flight.movementType === "departure";

                const MovementIcon = departure
                  ? ArrowUpFromLine
                  : ArrowDownToLine;

                return (
                  <article
                    key={flight.flightId}
                    className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[auto_1fr_auto_auto]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                      <MovementIcon size={18} className="text-cyan-300" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">
                          {flight.flightNumber}
                        </p>

                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[11px] capitalize",
                            statusClass(flight.status),
                          ].join(" ")}
                        >
                          {flight.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {flight.airline} · {flight.aircraftType}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock size={15} className="text-slate-500" />

                      <div>
                        <p>{flight.estimatedTime ?? flight.scheduledTime}</p>

                        <p className="text-xs text-slate-600">
                          Gate {flight.gate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Users size={15} className="text-slate-500" />

                      <div>
                        <p>{flight.expectedPassengers.toLocaleString()}</p>

                        <p className="text-xs text-slate-600">passengers</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
