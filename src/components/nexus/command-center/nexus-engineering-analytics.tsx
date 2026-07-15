"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  HeartPulse,
  Plane,
  Thermometer,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useNexusReplayStore } from "@/store/nexus-replay-store";

const HISTORY_LIMIT = 60;
const SNAPSHOT_EVENT = "lumi:nexus-replay-snapshot";

interface NumericMetric {
  field: string;
  sampleCount: number;
  minimum: number;
  maximum: number;
  average: number;
}

interface DatasetAnalytics {
  datasetId: string;
  filename: string;
  rowCount: number;
  alertCount: number;
  alertPercent: number;
  numericMetrics: NumericMetric[];
}

interface ReplayAnalytics {
  platform: "LUMI Nexus";
  runtimeMode: "dataset-replay";
  dataOrigin: "simulated";
  physicalControlEnabled: false;
  index: number;
  timestamp: string;
  totalRows: number;
  totalAlerts: number;
  alertPercent: number;
  datasets: DatasetAnalytics[];
}

interface EngineeringPoint {
  timestamp: string;
  label: string;
  powerKw: number;
  energyKwh: number;
  temperatureC: number;
  loadPercent: number;
  passengerCount: number;
  flightDelayMinutes: number;
  assetHealthPercent: number;
  alerts: number;
}

interface EngineeringSnapshot {
  powerKw: number;
  energyKwh: number;
  temperatureC: number;
  loadPercent: number;
  passengerCount: number;
  flightDelayMinutes: number;
  assetHealthPercent: number;
}

interface DomainEngineeringRow {
  domain: string;
  rows: number;
  alerts: number;
  metrics: number;
  health: number | null;
  primaryMetric: string;
  primaryValue: number | null;
}

const FIELD_GROUPS = {
  power: [
    "power_kw",
    "powerkw",
    "active_power",
    "demand_kw",
    "electrical_power",
    "total_power",
  ],
  energy: [
    "energy_kwh",
    "energykwh",
    "total_energy",
    "consumption_kwh",
    "electricity_kwh",
  ],
  temperature: [
    "temperature_c",
    "temp_c",
    "supply_temp",
    "return_temp",
    "ambient_temperature",
    "zone_temperature",
  ],
  load: [
    "load_percent",
    "load_percentage",
    "capacity_percent",
    "utilization_percent",
    "demand_percent",
  ],
  passenger: [
    "passenger_count",
    "passengers",
    "occupancy",
    "people_count",
    "queue_count",
  ],
  flightDelay: [
    "delay_minutes",
    "flight_delay",
    "departure_delay",
    "arrival_delay",
  ],
  health: [
    "health_percent",
    "asset_health",
    "health_score",
    "condition_score",
    "availability_percent",
  ],
} as const;

function normalizeField(field: string): string {
  return field.trim().toLowerCase().replaceAll("-", "_");
}

function fieldMatches(field: string, candidates: readonly string[]): boolean {
  const normalized = normalizeField(field);

  return candidates.some(
    (candidate) =>
      normalized === candidate ||
      normalized.includes(candidate) ||
      candidate.includes(normalized),
  );
}

function round(value: number, decimals = 2): number {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function sumMatchingMetrics(
  datasets: DatasetAnalytics[],
  fields: readonly string[],
): number {
  return round(
    datasets.reduce(
      (total, dataset) =>
        total +
        dataset.numericMetrics
          .filter((metric) => fieldMatches(metric.field, fields))
          .reduce((sum, metric) => sum + metric.average, 0),
      0,
    ),
  );
}

function averageMatchingMetrics(
  datasets: DatasetAnalytics[],
  fields: readonly string[],
): number {
  const values = datasets.flatMap((dataset) =>
    dataset.numericMetrics
      .filter((metric) => fieldMatches(metric.field, fields))
      .map((metric) => metric.average),
  );

  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function deriveEngineeringSnapshot(
  datasets: DatasetAnalytics[],
): EngineeringSnapshot {
  return {
    powerKw: sumMatchingMetrics(datasets, FIELD_GROUPS.power),
    energyKwh: sumMatchingMetrics(datasets, FIELD_GROUPS.energy),
    temperatureC: averageMatchingMetrics(datasets, FIELD_GROUPS.temperature),
    loadPercent: averageMatchingMetrics(datasets, FIELD_GROUPS.load),
    passengerCount: sumMatchingMetrics(datasets, FIELD_GROUPS.passenger),
    flightDelayMinutes: averageMatchingMetrics(
      datasets,
      FIELD_GROUPS.flightDelay,
    ),
    assetHealthPercent: averageMatchingMetrics(datasets, FIELD_GROUPS.health),
  };
}

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isReplayAnalytics(value: unknown): value is ReplayAnalytics {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ReplayAnalytics>;

  return (
    candidate.platform === "LUMI Nexus" &&
    candidate.runtimeMode === "dataset-replay" &&
    typeof candidate.index === "number" &&
    typeof candidate.timestamp === "string" &&
    Array.isArray(candidate.datasets)
  );
}

function EngineeringCard({
  title,
  value,
  unit,
  description,
  icon,
}: {
  title: string;
  value: number;
  unit: string;
  description: string;
  icon: React.ReactNode;
}) {
  const displayValue =
    value === 0
      ? "Not mapped"
      : new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 2,
        }).format(value);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {displayValue}
            {value !== 0 && (
              <span className="ml-1.5 text-sm font-normal text-slate-400">
                {unit}
              </span>
            )}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5 text-cyan-300">
          {icon}
        </div>
      </div>
    </article>
  );
}

function EngineeringChart({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 h-72">{children}</div>
    </article>
  );
}

export function NexusEngineeringAnalytics() {
  const { currentIndex, status } = useNexusReplayStore();

  const [analytics, setAnalytics] = useState<ReplayAnalytics | null>(null);
  const [history, setHistory] = useState<EngineeringPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (index: number) => {
    try {
      const response = await fetch(
        `/api/nexus/replay/analytics?index=${index}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload: unknown = await response.json();

      if (!response.ok || !isReplayAnalytics(payload)) {
        throw new Error("Unable to load engineering replay analytics.");
      }

      const engineering = deriveEngineeringSnapshot(payload.datasets);

      setAnalytics(payload);
      setError(null);

      setHistory((existing) => {
        const point: EngineeringPoint = {
          timestamp: payload.timestamp,
          label: formatTime(payload.timestamp),
          ...engineering,
          alerts: payload.totalAlerts,
        };

        const uniqueHistory = existing.filter(
          (existingPoint) => existingPoint.timestamp !== point.timestamp,
        );

        return [...uniqueHistory, point].slice(-HISTORY_LIMIT);
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown Nexus engineering analytics error.",
      );
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadAnalytics(currentIndex);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [currentIndex, loadAnalytics]);

  useEffect(() => {
    function handleSnapshot(event: Event): void {
      const snapshotEvent = event as CustomEvent<{ index?: number }>;
      const snapshotIndex = snapshotEvent.detail?.index;

      if (typeof snapshotIndex === "number") {
        void loadAnalytics(snapshotIndex);
      }
    }

    window.addEventListener(SNAPSHOT_EVENT, handleSnapshot);

    return () => {
      window.removeEventListener(SNAPSHOT_EVENT, handleSnapshot);
    };
  }, [loadAnalytics]);

  const current = useMemo(
    () =>
      analytics
        ? deriveEngineeringSnapshot(analytics.datasets)
        : {
            powerKw: 0,
            energyKwh: 0,
            temperatureC: 0,
            loadPercent: 0,
            passengerCount: 0,
            flightDelayMinutes: 0,
            assetHealthPercent: 0,
          },
    [analytics],
  );

  const domainRows = useMemo<DomainEngineeringRow[]>(
    () =>
      analytics?.datasets.map((dataset) => {
        const healthMetric = dataset.numericMetrics.find((metric) =>
          fieldMatches(metric.field, FIELD_GROUPS.health),
        );

        const primaryMetric = dataset.numericMetrics[0];

        return {
          domain: titleCase(dataset.datasetId),
          rows: dataset.rowCount,
          alerts: dataset.alertCount,
          metrics: dataset.numericMetrics.length,
          health: healthMetric?.average ?? null,
          primaryMetric: primaryMetric
            ? titleCase(primaryMetric.field)
            : "No numeric metric",
          primaryValue: primaryMetric?.average ?? null,
        };
      }) ?? [],
    [analytics],
  );

  return (
    <section
      aria-labelledby="nexus-engineering-analytics-title"
      className="space-y-6"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
            Engineering Intelligence Layer
          </p>
          <h2
            id="nexus-engineering-analytics-title"
            className="mt-2 text-2xl font-semibold text-white"
          >
            Airport Operational Engineering Analytics
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Unit-aware operational trends derived from synchronized Nexus
            datasets. Metrics remain simulation-derived until connected to
            validated airport field telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <Activity
            className={`h-4 w-4 ${
              status === "playing" ? "text-emerald-300" : "text-slate-500"
            }`}
          />
          <span className="text-sm font-medium text-slate-300">
            Replay {status}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EngineeringCard
          title="Airport power demand"
          value={current.powerKw}
          unit="kW"
          description="Aggregated active electrical power across mapped domains."
          icon={<Zap className="h-5 w-5" />}
        />

        <EngineeringCard
          title="Energy consumption"
          value={current.energyKwh}
          unit="kWh"
          description="Aggregated replay energy measurements."
          icon={<Gauge className="h-5 w-5" />}
        />

        <EngineeringCard
          title="Thermal condition"
          value={current.temperatureC}
          unit="°C"
          description="Average mapped HVAC and environmental temperature."
          icon={<Thermometer className="h-5 w-5" />}
        />

        <EngineeringCard
          title="Operational load"
          value={current.loadPercent}
          unit="%"
          description="Average mapped equipment or infrastructure loading."
          icon={<Activity className="h-5 w-5" />}
        />

        <EngineeringCard
          title="Passenger demand"
          value={current.passengerCount}
          unit="persons"
          description="Aggregated mapped passenger and occupancy demand."
          icon={<Users className="h-5 w-5" />}
        />

        <EngineeringCard
          title="Flight delay"
          value={current.flightDelayMinutes}
          unit="min"
          description="Average mapped flight delay measurement."
          icon={<Plane className="h-5 w-5" />}
        />

        <EngineeringCard
          title="Asset health"
          value={current.assetHealthPercent}
          unit="%"
          description="Average mapped health, condition or availability score."
          icon={<HeartPulse className="h-5 w-5" />}
        />

        <EngineeringCard
          title="Active alerts"
          value={analytics?.totalAlerts ?? 0}
          unit="alerts"
          description="Warnings and fault conditions at the current snapshot."
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <EngineeringChart
          title="Airport Power Demand"
          description="Operational electrical demand over the shared replay timeline."
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient
                  id="powerDemandGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit=" kW" />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="powerKw"
                name="Power demand"
                unit=" kW"
                stroke="#22d3ee"
                fill="url(#powerDemandGradient)"
                strokeWidth={2}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </EngineeringChart>

        <EngineeringChart
          title="Energy Consumption"
          description="Accumulated or interval energy measurements from mapped datasets."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit=" kWh" />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="energyKwh"
                name="Energy"
                unit=" kWh"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </EngineeringChart>

        <EngineeringChart
          title="HVAC Thermal and Load Conditions"
          description="Unit-separated thermal and operational demand trends."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis
                yAxisId="temperature"
                stroke="#64748b"
                fontSize={11}
                unit=" °C"
              />
              <YAxis
                yAxisId="load"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
                unit=" %"
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Line
                yAxisId="temperature"
                type="monotone"
                dataKey="temperatureC"
                name="Temperature"
                unit=" °C"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
              <Line
                yAxisId="load"
                type="monotone"
                dataKey="loadPercent"
                name="Operational load"
                unit=" %"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </EngineeringChart>

        <EngineeringChart
          title="Passenger and Flight Demand"
          description="Passenger activity and average flight-delay conditions."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis yAxisId="passengers" stroke="#64748b" fontSize={11} />
              <YAxis
                yAxisId="delay"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
                unit=" min"
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Line
                yAxisId="passengers"
                type="monotone"
                dataKey="passengerCount"
                name="Passengers"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
              <Line
                yAxisId="delay"
                type="monotone"
                dataKey="flightDelayMinutes"
                name="Flight delay"
                unit=" min"
                stroke="#fb7185"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </EngineeringChart>

        <EngineeringChart
          title="Asset Reliability"
          description="Asset-health score compared with operational alert count."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis
                yAxisId="health"
                stroke="#64748b"
                fontSize={11}
                domain={[0, 100]}
                unit=" %"
              />
              <YAxis
                yAxisId="alerts"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Line
                yAxisId="health"
                type="monotone"
                dataKey="assetHealthPercent"
                name="Asset health"
                unit=" %"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
              <Line
                yAxisId="alerts"
                type="monotone"
                dataKey="alerts"
                name="Alerts"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </EngineeringChart>

        <EngineeringChart
          title="Current Domain Alert Exposure"
          description="Current alert count by synchronized operational domain."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={domainRows}
              layout="vertical"
              margin={{
                left: 32,
              }}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis
                type="category"
                dataKey="domain"
                width={130}
                stroke="#64748b"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Bar
                dataKey="alerts"
                name="Alerts"
                fill="#f59e0b"
                radius={[0, 6, 6, 0]}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        </EngineeringChart>
      </div>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Domain Engineering Matrix
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Current data availability, alarms, health and primary engineering
            values by domain.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-3">Domain</th>
                <th className="px-3 py-3">Rows</th>
                <th className="px-3 py-3">Metrics</th>
                <th className="px-3 py-3">Alerts</th>
                <th className="px-3 py-3">Health</th>
                <th className="px-3 py-3">Primary metric</th>
                <th className="px-3 py-3">Value</th>
              </tr>
            </thead>

            <tbody>
              {domainRows.map((row) => (
                <tr key={row.domain} className="border-b border-slate-900">
                  <td className="px-3 py-3 font-medium text-slate-200">
                    {row.domain}
                  </td>
                  <td className="px-3 py-3 text-slate-400">{row.rows}</td>
                  <td className="px-3 py-3 text-slate-400">{row.metrics}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${
                        row.alerts > 0
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      }`}
                    >
                      {row.alerts}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    {row.health === null
                      ? "Not mapped"
                      : `${round(row.health)}%`}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {row.primaryMetric}
                  </td>
                  <td className="px-3 py-3 text-slate-200">
                    {row.primaryValue === null ? "—" : round(row.primaryValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
        <p className="text-sm font-medium text-violet-200">
          Engineering interpretation boundary
        </p>
        <p className="mt-2 text-xs leading-5 text-violet-200/70">
          A value marked “Not mapped” means the replay dataset does not yet
          expose a recognized unit-specific field. The system does not invent
          missing engineering measurements. All current values remain simulated
          and physical equipment control remains disabled.
        </p>
      </div>
    </section>
  );
}
