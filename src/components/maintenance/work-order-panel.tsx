"use client";

import { ClipboardList, RefreshCw, Wrench } from "lucide-react";

import { useCallback, useState } from "react";

import type { MaintenanceWorkOrder } from "@/types/diagnostics";

export function WorkOrderPanel() {
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);

  const [loading, setLoading] = useState(false);

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/maintenance/work-orders", {
        cache: "no-store",
      });

      const result = (await response.json()) as {
        success: boolean;
        workOrders: MaintenanceWorkOrder[];
      };

      setWorkOrders(result.workOrders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-cyan-300" />

            <h2 className="text-lg font-semibold text-white">
              Maintenance Work Orders
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            LUMI-generated inspection and corrective-maintenance tasks
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadWorkOrders()}
          disabled={loading}
          className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
          aria-label="Reload work orders"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="p-5">
        {workOrders.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <Wrench size={32} className="text-slate-600" />

            <p className="mt-3 font-medium text-slate-300">
              No work orders loaded
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create a work order from a LUMI diagnostic finding, then refresh
              this panel.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workOrders.map((workOrder) => (
              <article
                key={workOrder.workOrderId}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {workOrder.equipmentId} · {workOrder.title}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      {workOrder.description}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 capitalize">
                      {workOrder.priority}
                    </span>

                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 capitalize">
                      {workOrder.status}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600">
                  Work order: {workOrder.workOrderId}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
