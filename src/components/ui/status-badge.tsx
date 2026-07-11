import type { EquipmentStatus } from "@/types/hvac";

interface StatusBadgeProps {
  status: EquipmentStatus;
}

const statusClasses: Record<EquipmentStatus, string> = {
  running: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  standby: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  stopped: "border-slate-600 bg-slate-800 text-slate-300",
  starting: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  stopping: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  warning: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  alarm: "border-red-500/40 bg-red-500/10 text-red-300",
  maintenance: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  offline: "border-slate-700 bg-slate-900 text-slate-500",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        statusClasses[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}
