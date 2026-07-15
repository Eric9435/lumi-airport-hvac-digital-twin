import type { Metadata } from "next";
import Link from "next/link";

import { createNexusOperationsSnapshot } from "@/nexus/operations";

export const metadata: Metadata = {
  title: "Operations Console",
  description:
    "Unified LUMI Nexus event, agent, approval and platform-health operations console.",
};

export const dynamic = "force-dynamic";

function indicatorClass(value: string): string {
  if (["critical", "failed", "rejected"].includes(value)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (["high", "medium", "warning", "pending", "degraded"].includes(value)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["operational", "approved", "completed", "info", "low"].includes(value)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function NexusOperationsPage() {
  const snapshot = await createNexusOperationsSnapshot();

  const cards = [
    {
      label: "Platform Status",
      value: snapshot.platformStatus,
      detail: `${snapshot.registeredAssets} registered assets`,
    },
    {
      label: "Agent Runtime",
      value: snapshot.registeredAgents,
      detail: "Deterministic registered agents",
    },
    {
      label: "Pending Approvals",
      value: snapshot.pendingApprovals,
      detail: "Human-in-the-loop queue",
    },
    {
      label: "Recent Events",
      value: snapshot.eventCount,
      detail: `${snapshot.criticalEventCount} critical`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.32em] text-cyan-400 uppercase">
                LUMI Nexus Platform Operations
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Operations Console
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Unified operational visibility for Nexus events, deterministic
                agents, human approvals, platform health and cross-domain
                intelligence workflows.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${indicatorClass(
                  snapshot.platformStatus,
                )}`}
              >
                {snapshot.platformStatus}
              </span>

              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-violet-300 uppercase">
                Human Supervised
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

              <p className="mt-2 text-3xl font-semibold text-white capitalize">
                {card.value}
              </p>

              <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Nexus Event Stream
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Most recent cross-domain events and agent findings.
                </p>
              </div>

              <span className="text-xs text-slate-500">
                {snapshot.approvalRequiredEventCount} events require approval
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Event</th>
                    <th className="px-3 py-3">Twin</th>
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Severity</th>
                    <th className="px-3 py-3">Approval</th>
                    <th className="px-3 py-3">Timestamp</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.events.map((event) => (
                    <tr
                      key={event.eventId}
                      className="border-b border-slate-900"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-200">
                          {event.eventType}
                        </p>
                        <p className="text-xs text-slate-600">
                          {event.correlationId}
                        </p>
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {event.sourceTwin}
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {event.assetId ?? "—"}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${indicatorClass(
                            event.severity,
                          )}`}
                        >
                          {event.severity}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        {event.requiresHumanApproval ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 uppercase">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">No</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-xs text-slate-500">
                        {formatUtc(event.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {snapshot.events.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                No Nexus events have been published in this runtime.
              </div>
            )}
          </article>

          <div className="space-y-6">
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
                      <p className="font-medium text-slate-200">{agent.name}</p>

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

                    <p className="mt-2 text-xs text-slate-600">
                      {agent.supportedTwins.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Approval Queue
              </h2>

              <div className="mt-4 space-y-3">
                {snapshot.approvals.length > 0 ? (
                  snapshot.approvals.map((approval) => (
                    <div
                      key={approval.approvalId}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-slate-200">
                          {approval.action}
                        </p>

                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${indicatorClass(
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
                      </p>

                      <p className="mt-2 text-xs text-slate-600">
                        Requested by {approval.requestedBy}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                    No approval requests are currently pending.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold text-white">
                Control Governance
              </h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">
                    Physical autonomous control
                  </dt>
                  <dd className="text-red-300">Disabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Human approval workflow</dt>
                  <dd className="text-emerald-300">Enabled</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Agent runtime</dt>
                  <dd className="text-cyan-300">Deterministic</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Audit readiness</dt>
                  <dd className="text-emerald-300">Enabled</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/80">
          The Operations Console provides read-only operational visibility.
          Agent findings and recommendations do not execute physical airport
          controls. Safety-critical actions remain subject to authorised human
          approval and field verification.
        </footer>
      </div>
    </main>
  );
}
