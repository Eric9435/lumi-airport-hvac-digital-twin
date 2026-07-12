import type { ReactNode } from "react";

export function formatRuntime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

export function formatMmk(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} MMK`;
}

export function StatusPill({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();

  const className =
    normalizedStatus.includes("fault") ||
    normalizedStatus.includes("trip") ||
    normalizedStatus.includes("unavailable") ||
    normalizedStatus.includes("insufficient")
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : normalizedStatus.includes("running") ||
          normalizedStatus.includes("energized") ||
          normalizedStatus.includes("delta")
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : normalizedStatus.includes("start") ||
            normalizedStatus.includes("transition") ||
            normalizedStatus.includes("degraded")
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : normalizedStatus.includes("automatic")
            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
            : "border-slate-600 bg-slate-800 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${className}`}
    >
      {status.replaceAll("-", " ")}
    </span>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}
