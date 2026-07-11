import Link from "next/link";

import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <SearchX size={42} className="mx-auto text-slate-500" />

        <p className="mt-6 text-xs font-semibold tracking-[0.28em] text-cyan-400 uppercase">
          Error 404
        </p>

        <h1 className="mt-3 text-2xl font-semibold text-white">
          Page Not Found
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          The requested digital-twin module does not exist.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
        >
          <ArrowLeft size={16} />
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
