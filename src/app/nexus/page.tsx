import type { Metadata } from "next";

import { createNexusPlatformSnapshot } from "@/nexus/platform";

export const metadata: Metadata = {
  title: "LUMI Nexus Command Center",
  description:
    "Unified command and intelligence center for LUMI airport infrastructure Digital Twins.",
};

export const dynamic = "force-dynamic";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function labelClass(value: string): string {
  if (["operational", "online", "running", "enabled"].includes(value)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (["foundation", "standby", "pending", "warning"].includes(value)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["fault", "offline", "critical", "failed"].includes(value)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

export default async function NexusPage() {
  const snapshot = await createNexusPlatformSnapshot(12);

  const cards = [
    {
      label: "Connected Domains",
      value: snapshot.health.connectedDomains,
      detail: `${snapshot.health.enabledDomains} enabled`,
    },
    {
      label: "Registered Assets",
      value: snapshot.health.registeredNexusAssets,
      detail: `${snapshot.health.powerFoundationAssets} Power foundation assets`,
    },
    {
      label: "Nexus Agents",
      value: snapshot.health.registeredAgents,
      detail: "Deterministic and LLM-ready",
    },
    {
      label: "Pending Approvals",
      value: snapshot.health.pendingApprovals,
      detail: "Human-in-the-loop controls",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold tracking-[0.3em] text-cyan-300 uppercase">
                Autonomous Airport Infrastructure Intelligence Platform
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                LUMI Nexus
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                A modular, Industry 5.0-aligned platform connecting Digital
                Twins, Industrial IoT, deterministic engineering agents,
                predictive maintenance, energy intelligence and human-centred
                operational control.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${labelClass(
                  snapshot.health.status,
                )}`}
              >
                {snapshot.health.status}
              </span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-300 uppercase">
                Modular Monolith
              </span>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-violet-300 uppercase">
                Simulation Only
              </span>
            </div>
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

        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-white">
              Connected Domain Twins
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              HVAC is operational. Power, Energy and Maintenance are currently
              foundation-stage simulation domains.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.domains.map((domain) => (
              <article
                key={domain.twinType}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-white">{domain.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {domain.description}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase ${labelClass(
                      domain.maturity,
                    )}`}
                  >
                    {domain.maturity}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {domain.capabilities.length > 0 ? (
                    domain.capabilities.map((capability) => (
                      <span
                        key={capability}
                        className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                      >
                        {capability}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">
                      Planned for a future phase
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold text-white">
              Registered Agents
            </h2>
            <div className="mt-4 space-y-3">
              {snapshot.agents.map((agent) => (
                <div
                  key={agent.agentId}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium text-slate-100">{agent.name}</h3>
                    <div className="flex gap-2">
                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300 uppercase">
                        Deterministic
                      </span>
                      {agent.llmReady && (
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300 uppercase">
                          LLM-ready
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {agent.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold text-white">
              Recent Nexus Events
            </h2>

            <div className="mt-4 space-y-3">
              {snapshot.recentEvents.length > 0 ? (
                snapshot.recentEvents.map((event) => (
                  <div
                    key={event.eventId}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-slate-100">
                        {event.eventType}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${labelClass(
                          event.severity,
                        )}`}
                      >
                        {event.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {event.sourceTwin}
                      {event.assetId ? ` • ${event.assetId}` : ""}
                      {" • "}
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                  No Nexus events have been published in this runtime.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold text-white">Asset Registry</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Twin</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.assets.slice(0, 12).map((asset) => (
                    <tr key={asset.id} className="border-b border-slate-900">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-200">
                          {asset.name}
                        </p>
                        <p className="text-xs text-slate-500">{asset.id}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        {asset.twinType}
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        {asset.assetType}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${labelClass(
                            asset.status,
                          )}`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        {asset.healthScore ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {snapshot.assets.length > 12 && (
              <p className="mt-4 text-xs text-slate-500">
                Showing 12 of {snapshot.assets.length} registered Nexus assets.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold text-white">
              Human Approval Queue
            </h2>

            <div className="mt-4 space-y-3">
              {snapshot.approvals.length > 0 ? (
                snapshot.approvals.slice(0, 10).map((approval) => (
                  <div
                    key={approval.approvalId}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-slate-100">
                        {approval.action}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${labelClass(
                          approval.status,
                        )}`}
                      >
                        {approval.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {approval.targetTwin}
                      {approval.targetAssetId
                        ? ` • ${approval.targetAssetId}`
                        : ""}
                      {" • "}
                      Requested by {approval.requestedBy}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
                  <p className="text-sm text-slate-400">
                    No approval requests are currently pending.
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Plant-wide control, load shedding, emergency shutdown and
                    future physical commands require human approval.
                  </p>
                </div>
              )}
            </div>
          </article>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          LUMI Nexus is currently a simulation and engineering decision-support
          platform. Power, Energy and Maintenance domains are foundation-stage
          models. No autonomous physical airport control is enabled.
        </footer>
      </div>
    </main>
  );
}
