import type { Metadata } from "next";
import Link from "next/link";

import { createMaintenanceTwinSnapshot } from "@/nexus/maintenance";

export const metadata: Metadata = {
  title: "Maintenance Twin",
  description:
    "Cross-domain airport asset-health, reliability, service-due and predictive-maintenance intelligence dashboard.",
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

function indicatorClass(value: string): string {
  if (["critical", "fault", "offline"].includes(value)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (["high", "warning", "service-due"].includes(value)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["medium", "maintenance"].includes(value)) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default async function MaintenanceTwinPage() {
  const snapshot = await createMaintenanceTwinSnapshot();

  const cards = [
    {
      label: "Monitored Assets",
      value: snapshot.monitoredAssetCount,
      detail: `${snapshot.sourceAssetCount} registry assets evaluated`,
    },
    {
      label: "Critical Priority",
      value: snapshot.criticalAssetCount,
      detail: "Immediate engineering review",
    },
    {
      label: "High Priority",
      value: snapshot.highPriorityAssetCount,
      detail: "Plan inspection or intervention",
    },
    {
      label: "Average Health",
      value:
        snapshot.averageHealthScore === null
          ? "—"
          : `${formatNumber(snapshot.averageHealthScore)}%`,
      detail: `${snapshot.serviceDueCount} service-due assets`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.32em] text-cyan-400 uppercase">
                LUMI Nexus Cross-Domain Twin
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Maintenance Twin
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Cross-domain airport maintenance intelligence for asset health,
                reliability, service planning, failure risk and
                maintenance-priority assessment.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
                Predictive Foundation
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
              href="/nexus/energy"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Open Energy Twin
            </Link>

            <Link
              href="/nexus/power"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Open Power Twin
            </Link>

            <Link
              href="/dashboard"
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
                  Maintenance Priority Register
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Deterministic cross-domain asset maintenance assessment.
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
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Twin</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Health</th>
                    <th className="px-3 py-3">MTBF</th>
                    <th className="px-3 py-3">MTTR</th>
                    <th className="px-3 py-3">Failure Risk</th>
                    <th className="px-3 py-3">Next Service</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.assets.slice(0, 50).map((asset) => (
                    <tr
                      key={asset.assetId}
                      className="border-b border-slate-900"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-200">
                          {asset.assetName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {asset.assetId}
                        </p>
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {asset.twinType}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${indicatorClass(
                            asset.priority,
                          )}`}
                        >
                          {asset.priority}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.status}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.healthScore === null
                          ? "—"
                          : `${formatNumber(asset.healthScore)}%`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.mtbfHours === null
                          ? "—"
                          : `${formatNumber(asset.mtbfHours, 0)} h`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.mttrHours === null
                          ? "—"
                          : `${formatNumber(asset.mttrHours)} h`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.failureProbability === null
                          ? "—"
                          : `${formatNumber(asset.failureProbability * 100)}%`}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.nextServiceDate ?? "Not configured"}

                        {asset.serviceDue && (
                          <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 uppercase">
                            Due
                          </span>
                        )}
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
                Maintenance Intelligence Agent
              </h2>

              {snapshot.finding ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${indicatorClass(
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

                          {action.requiresHumanApproval && (
                            <span className="mt-3 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 uppercase">
                              Human approval required
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  No Maintenance Intelligence Agent finding is currently
                  available. The deterministic priority register remains active.
                </p>
              )}
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Maintenance Cost Model
              </h2>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">
                  Configured estimated cost
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {snapshot.estimatedMaintenanceCost === null
                    ? "Not configured"
                    : formatNumber(snapshot.estimatedMaintenanceCost, 0)}
                </p>
              </div>
            </article>
          </div>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          Maintenance Twin priorities are derived from configured asset status,
          health scores, service dates and predictive metadata. They do not
          replace field inspection, OEM procedures, statutory maintenance
          requirements or authorised engineering decisions.
        </footer>
      </div>
    </main>
  );
}
