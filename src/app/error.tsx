"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
          <AlertTriangle size={32} className="text-red-300" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-white">
          Digital Twin Runtime Error
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          The application encountered an unexpected error. The virtual HVAC
          system has not issued any physical control command.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-slate-600">
            Reference: {error.digest}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
        >
          <RefreshCw size={16} />
          Retry application
        </button>
      </section>
    </main>
  );
}
