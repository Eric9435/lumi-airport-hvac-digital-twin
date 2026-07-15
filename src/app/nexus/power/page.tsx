import type { Metadata } from "next";
import Link from "next/link";

import { createPowerTwinSnapshot } from "@/nexus/power";

export const metadata: Metadata = {
  title: "Power Twin",
  description:
    "Airport electrical distribution, transformers, emergency generation, ATS and power-intelligence dashboard.",
};

export const dynamic = "force-dynamic";

function formatNumber(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

function statusClass(status: string): string {
  if (["online", "running", "operational"].includes(status)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (["standby", "warning", "medium", "high"].includes(status)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["fault", "offline", "critical", "unavailable"].includes(status)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

export default async function PowerTwinPage() {
  const snapshot = await createPowerTwinSnapshot();

  const cards = [
    {
      label: "Power Assets",
      value: snapshot.assetCount,
      detail: "Registered in Nexus",
    },
    {
      label: "Transformers",
      value: snapshot.transformerCount,
      detail: "Airport distribution assets",
    },
    {
      label: "Average Transformer Load",
      value:
        snapshot.averageTransformerLoadPercent === null
          ? "—"
          : `${formatNumber(snapshot.averageTransformerLoadPercent)}%`,
      detail: `Peak ${formatNumber(snapshot.highestTransformerLoadPercent)}%`,
    },
    {
      label: "Abnormal Assets",
      value: snapshot.abnormalCount,
      detail: "Warning, fault or offline",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-cyan-300 uppercase">
                LUMI Nexus Domain Twin
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Power Twin
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Foundation-stage airport electrical distribution intelligence
                covering utility supply, transformers, emergency generation,
                automatic transfer switching, loading, voltage, frequency and
                asset health.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
                Foundation
              </span>

              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-violet-300 uppercase">
                Simulation Only
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/nexus"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500/50 hover:text-white"
            >
              Back to Nexus
            </Link>

            <Link
              href="/hvac"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
            >
              Open HVAC Twin
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Electrical Asset Inventory
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Unified Power Twin assets registered in LUMI Nexus.
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
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Load</th>
                    <th className="px-3 py-3">Voltage</th>
                    <th className="px-3 py-3">Frequency</th>
                    <th className="px-3 py-3">Health</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.assets.map((asset) => (
                    <tr key={asset.id} className="border-b border-slate-900">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-200">
                          {asset.name}
                        </p>
                        <p className="text-xs text-slate-500">{asset.id}</p>
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {asset.assetType}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(
                            asset.status,
                          )}`}
                        >
                          {asset.status}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.loadPercent === undefined
                          ? "—"
                          : `${formatNumber(asset.loadPercent)}%`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.voltageV === undefined
                          ? "—"
                          : `${formatNumber(asset.voltageV, 0)} V`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.frequencyHz === undefined
                          ? "—"
                          : `${formatNumber(asset.frequencyHz, 2)} Hz`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.healthScore ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-semibold text-white">
              Power Operations Agent
            </h2>

            {snapshot.finding ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${statusClass(
                      snapshot.finding.severity,
                    )}`}
                  >
                    {snapshot.finding.severity}
                  </span>

                  <span className="text-xs text-slate-500">
                    Confidence {Math.round(snapshot.finding.confidence * 100)}%
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-100">
                    {snapshot.finding.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {snapshot.finding.explanation}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Runtime
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Deterministic engineering rules
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    No autonomous electrical switching is enabled.
                  </p>
                </div>

                {snapshot.finding.recommendedActions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Recommended Actions
                    </p>

                    <div className="mt-3 space-y-3">
                      {snapshot.finding.recommendedActions.map((action) => (
                        <div
                          key={action.actionId}
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <p className="font-medium text-slate-200">
                            {action.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {action.description}
                          </p>

                          {action.requiresHumanApproval && (
                            <span className="mt-3 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 uppercase">
                              Human approval required
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No Power Operations Agent finding is available.
              </p>
            )}
          </article>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          The Power Twin is currently a foundation-stage simulation. Values are
          configured engineering data and must not be treated as live airport
          electrical measurements. Switching, ATS transfer, breaker operation
          and generator control remain disabled.
        </footer>
      </div>
    </main>
  );
}
