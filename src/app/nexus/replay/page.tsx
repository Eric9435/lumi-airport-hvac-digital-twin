import type { Metadata } from "next";

import { NexusReplayConsole } from "@/components/nexus/replay/nexus-replay-console";

export const metadata: Metadata = {
  title: "Replay Console | LUMI Nexus",
  description:
    "Control and inspect the synchronized 24-hour LUMI Nexus operational dataset replay.",
};

export default function NexusReplayPage() {
  return (
    <main
      id="lumi-main-content"
      className="min-h-screen bg-slate-950 px-4 py-6 pt-24 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1600px]">
        <header className="border-b border-slate-800 pb-6">
          <p className="text-sm font-semibold tracking-[0.18em] text-cyan-400 uppercase">
            LUMI Nexus
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Operational Replay Console
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400 sm:text-base">
            Run and inspect the synchronized 24-hour airport infrastructure
            scenario across power, energy, safety, passenger, flight, baggage,
            environmental, building and platform domains.
          </p>
        </header>

        <div className="mt-6">
          <NexusReplayConsole />
        </div>
      </div>
    </main>
  );
}
