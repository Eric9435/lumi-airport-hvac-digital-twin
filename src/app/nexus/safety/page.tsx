import type { Metadata } from "next";
import Link from "next/link";

import { createSafetyTwinSnapshot } from "@/nexus/safety";

export const metadata: Metadata = {
  title: "Safety Twin",
  description:
    "Airport infrastructure safety readiness, critical assets, alarms, events and human-approval intelligence.",
};

export const dynamic = "force-dynamic";

function indicatorClass(value: string): string {
  if (["critical", "fault", "offline"].includes(value)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (["degraded", "high", "attention"].includes(value)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["medium", "warning"].includes(value)) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default async function SafetyTwinPage() {
  const snapshot = await createSafetyTwinSnapshot();

  const cards = [
    {
      label: "Safety Readiness",
      value: `${snapshot.readinessScore}%`,
      detail: snapshot.readinessStatus,
    },
    {
      label: "Critical Assets",
      value: snapshot.criticalAssets,
      detail: `${snapshot.unavailableCriticalAssets} unavailable`,
    },
    {
      label: "Safety Events",
      value: snapshot.recentEventCount,
      detail: `${snapshot.criticalEventCount} critical`,
    },
    {
      label: "Approval Required",
      value: snapshot.approvalRequiredEventCount,
      detail: "Human-supervised actions",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.32em] text-cyan-400 uppercase">
                LUMI Nexus Airport Safety Intelligence
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Safety Twin
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Cross-domain safety-readiness view for critical infrastructure
                assets, alarms, abnormal events, emergency conditions and
                human-supervised operational decisions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${indicatorClass(
                  snapshot.readinessStatus,
                )}`}
              >
                {snapshot.readinessStatus}
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
              href="/nexus/maintenance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Maintenance Twin
            </Link>

            <Link
              href="/nexus/power"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Power Twin
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

              <p className="mt-2 text-sm text-slate-500 capitalize">
                {card.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold text-white">
              Critical Infrastructure Register
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Assets ordered by deterministic safety priority.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Twin</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Criticality</th>
                    <th className="px-3 py-3">Reason</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.assets.slice(0, 40).map((asset) => (
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

                      <td className="px-3 py-3 text-slate-400">
                        {asset.assetType}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${indicatorClass(
                            asset.safetyPriority,
                          )}`}
                        >
                          {asset.safetyPriority}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.status}
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {asset.criticality}
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {asset.reason}
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
                Safety Event Stream
              </h2>

              <div className="mt-4 space-y-3">
                {snapshot.events.length > 0 ? (
                  snapshot.events.slice(0, 15).map((event) => (
                    <div
                      key={event.eventId}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-slate-200">
                          {event.eventType}
                        </p>

                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${indicatorClass(
                            event.severity,
                          )}`}
                        >
                          {event.severity}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {event.description}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {event.sourceTwin}
                        {event.assetId ? ` • ${event.assetId}` : ""}
                      </p>

                      {event.requiresHumanApproval && (
                        <span className="mt-3 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 uppercase">
                          Human approval required
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                    No medium-or-higher safety events are currently recorded.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Safety Control Policy
              </h2>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">
                    Autonomous emergency control
                  </dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Physical shutdown</dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Human approval</dt>
                  <dd className="text-emerald-300">Required</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Field verification</dt>
                  <dd className="text-emerald-300">Required</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          Safety Twin is an engineering decision-support and simulation layer.
          It does not replace airport emergency procedures, fire systems,
          statutory inspections, authorised controllers, field verification or
          emergency command personnel.
        </footer>
      </div>
    </main>
  );
}
