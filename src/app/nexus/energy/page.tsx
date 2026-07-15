import type { Metadata } from "next";
import Link from "next/link";

import { createEnergyTwinSnapshot } from "@/nexus/energy";

export const metadata: Metadata = {
  title: "Energy Twin",
  description:
    "Cross-domain airport energy demand, consumption, efficiency, cost and carbon intelligence dashboard.",
};

export const dynamic = "force-dynamic";

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function severityClass(severity: string): string {
  if (["critical", "fault", "offline"].includes(severity)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (["high", "medium", "warning"].includes(severity)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["low", "info", "operational"].includes(severity)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

export default async function EnergyTwinPage() {
  const snapshot = await createEnergyTwinSnapshot();

  const cards = [
    {
      label: "Estimated Demand",
      value: `${formatNumber(snapshot.estimatedDemandKw)} kW`,
      detail: `${snapshot.meteredAssetCount} modeled assets`,
    },
    {
      label: "Daily Energy",
      value: `${formatNumber(snapshot.estimatedDailyEnergyKwh)} kWh`,
      detail: "Model-derived estimate",
    },
    {
      label: "Monthly Energy",
      value: `${formatNumber(snapshot.estimatedMonthlyEnergyKwh, 0)} kWh`,
      detail: "30-day projection",
    },
    {
      label: "Average Power Factor",
      value:
        snapshot.averagePowerFactor === null
          ? "—"
          : formatNumber(snapshot.averagePowerFactor, 3),
      detail: "Configured electrical assets",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-cyan-300 uppercase">
                LUMI Nexus Cross-Domain Twin
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Energy Twin
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Cross-domain airport energy intelligence combining configured
                HVAC and electrical asset data into demand, consumption,
                efficiency, cost and carbon estimates.
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
              href="/nexus/power"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Open Power Twin
            </Link>

            <Link
              href="/hvac"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Open HVAC Twin
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

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Energy Contribution Model
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Highest modeled demand contributors across connected Digital
                  Twins.
                </p>
              </div>

              <span className="text-xs text-slate-500">
                {snapshot.sourceAssetCount} source assets evaluated
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Twin</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Demand</th>
                    <th className="px-3 py-3">Daily Energy</th>
                    <th className="px-3 py-3">Contribution</th>
                    <th className="px-3 py-3">Source</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.contributions.slice(0, 20).map((contribution) => (
                    <tr
                      key={contribution.assetId}
                      className="border-b border-slate-900"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-200">
                          {contribution.assetName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {contribution.assetId}
                        </p>
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {contribution.twinType}
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {contribution.assetType}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(contribution.activePowerKw)} kW
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(contribution.estimatedDailyEnergyKwh)} kWh
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {formatNumber(contribution.contributionPercent)}%
                      </td>

                      <td className="px-3 py-3 text-xs text-slate-500">
                        {contribution.measurementSource}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {snapshot.contributions.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                No assets currently expose configured power or load metadata.
              </div>
            )}
          </article>

          <div className="space-y-6">
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Financial & Carbon Model
              </h2>

              <dl className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <dt className="text-sm text-slate-400">Tariff per kWh</dt>
                  <dd className="font-medium text-slate-200">
                    {snapshot.configuredTariffPerKwh === null
                      ? "Not configured"
                      : formatNumber(snapshot.configuredTariffPerKwh, 2)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <dt className="text-sm text-slate-400">
                    Estimated monthly cost
                  </dt>
                  <dd className="font-medium text-slate-200">
                    {snapshot.estimatedMonthlyCost === null
                      ? "Not available"
                      : formatNumber(snapshot.estimatedMonthlyCost, 0)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <dt className="text-sm text-slate-400">Carbon intensity</dt>
                  <dd className="font-medium text-slate-200">
                    {snapshot.carbonIntensityKgPerKwh === null
                      ? "Not configured"
                      : `${formatNumber(
                          snapshot.carbonIntensityKgPerKwh,
                          3,
                        )} kg/kWh`}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-slate-400">
                    Renewable contribution
                  </dt>
                  <dd className="font-medium text-slate-200">
                    {formatNumber(snapshot.renewableContributionPercent)}%
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Energy Intelligence Agent
              </h2>

              {snapshot.finding ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${severityClass(
                        snapshot.finding.severity,
                      )}`}
                    >
                      {snapshot.finding.severity}
                    </span>

                    <span className="text-xs text-slate-500">
                      Confidence {Math.round(snapshot.finding.confidence * 100)}
                      %
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

                  {snapshot.finding.recommendedActions.length > 0 && (
                    <div className="space-y-3">
                      {snapshot.finding.recommendedActions.map((action) => (
                        <div
                          key={action.actionId}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <p className="font-medium text-slate-200">
                            {action.title}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {action.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  The Energy Intelligence Agent did not return a finding. The
                  model-derived engineering metrics remain available.
                </p>
              )}
            </article>
          </div>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          Energy Twin values are engineering estimates derived from configured
          asset metadata, utilization assumptions and simulation data. They are
          not utility-grade revenue-meter readings and must not be used for
          billing or contractual settlement.
        </footer>
      </div>
    </main>
  );
}
