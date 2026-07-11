import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
          <Icon size={18} className="text-cyan-300" />
        </div>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </article>
  );
}
