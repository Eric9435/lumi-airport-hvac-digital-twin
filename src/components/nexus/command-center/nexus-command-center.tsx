"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Database,
  Gauge,
  Network,
  Pause,
  Play,
  RotateCcw,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
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

import { NexusEngineeringAnalytics } from "@/components/nexus/command-center/nexus-engineering-analytics";

import {
  NEXUS_REPLAY_SPEED_OPTIONS,
  isNexusReplaySpeed,
  useNexusReplayStore,
  type NexusReplaySpeed,
} from "@/store/nexus-replay-store";

const SNAPSHOT_EVENT = "lumi:nexus-replay-snapshot";
const HISTORY_LIMIT = 48;

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
  statusField: string | null;
  statusDistribution: Record<string, number>;
  alertCount: number;
  alertPercent: number;
  numericMetricCount: number;
  numericMetrics: NumericMetric[];
}

interface ReplayAnalytics {
  platform: "LUMI Nexus";
  runtimeMode: "dataset-replay";
  dataOrigin: "simulated";
  physicalControlEnabled: false;
  index: number;
  timestamp: string;
  progressPercent: number;
  datasetCount: number;
  totalRows: number;
  totalAlerts: number;
  alertPercent: number;
  datasetsWithAlerts: number;
  numericMetricCount: number;
  datasets: DatasetAnalytics[];
}

interface HistoryPoint {
  label: string;
  timestamp: string;
  totalRows: number;
  totalAlerts: number;
  numericMetricCount: number;
  alertPercent: number;
}

interface DomainPresentation {
  id: string;
  name: string;
  shortName: string;
}

const DOMAIN_PRESENTATIONS: DomainPresentation[] = [
  { id: "hvac", name: "HVAC Digital Twin", shortName: "HVAC" },
  { id: "power", name: "Power Distribution", shortName: "Power" },
  { id: "emergency-power", name: "Emergency Power", shortName: "Emergency" },
  { id: "energy", name: "Energy & Utilities", shortName: "Energy" },
  { id: "safety", name: "Safety Systems", shortName: "Safety" },
  { id: "passenger", name: "Passenger Flow", shortName: "Passenger" },
  { id: "flight", name: "Flight Operations", shortName: "Flights" },
  { id: "baggage", name: "Baggage Operations", shortName: "Baggage" },
  { id: "environment", name: "Airport Environment", shortName: "Environment" },
  {
    id: "infrastructure",
    name: "Building Infrastructure",
    shortName: "Building",
  },
  { id: "platform", name: "Platform Health", shortName: "Platform" },
];

function formatRuntimeTime(value: string | null): string {
  if (!value) {
    return "Awaiting replay snapshot";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatChartTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDomain(datasetId: string): DomainPresentation {
  const normalized = datasetId.toLowerCase();

  const match = DOMAIN_PRESENTATIONS.find((domain) =>
    normalized.includes(domain.id),
  );

  return (
    match ?? {
      id: normalized,
      name: titleCase(datasetId),
      shortName: titleCase(datasetId).slice(0, 12),
    }
  );
}

function metricUnit(field: string): string {
  const normalized = field.toLowerCase();

  if (normalized.includes("power") || normalized.endsWith("_kw")) return "kW";
  if (normalized.includes("energy") || normalized.endsWith("_kwh"))
    return "kWh";
  if (normalized.includes("temperature") || normalized.includes("temp"))
    return "°C";
  if (normalized.includes("percent") || normalized.includes("load")) return "%";
  if (normalized.includes("voltage")) return "V";
  if (normalized.includes("current") || normalized.includes("amp")) return "A";
  if (normalized.includes("frequency")) return "Hz";
  if (normalized.includes("flow")) return "flow";

  return "";
}

function statusTone(alertCount: number): string {
  return alertCount > 0
    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
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

function KpiCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/15 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5 text-cyan-300">
          {icon}
        </div>
      </div>
    </motion.article>
  );
}

function ChartCard({
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
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="mt-5 h-72">{children}</div>
    </article>
  );
}

export function NexusCommandCenter() {
  const {
    currentIndex,
    snapshotCount,
    speed,
    status,
    timestamp,
    error,
    play,
    pause,
    reset,
    setSpeed,
  } = useNexusReplayStore();

  const [analytics, setAnalytics] = useState<ReplayAnalytics | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

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
        throw new Error("Unable to load Nexus replay analytics.");
      }

      setAnalytics(payload);
      setAnalyticsError(null);

      setHistory((existing) => {
        const nextPoint: HistoryPoint = {
          label: formatChartTime(payload.timestamp),
          timestamp: payload.timestamp,
          totalRows: payload.totalRows,
          totalAlerts: payload.totalAlerts,
          numericMetricCount: payload.numericMetricCount,
          alertPercent: payload.alertPercent,
        };

        const withoutDuplicate = existing.filter(
          (point) => point.timestamp !== nextPoint.timestamp,
        );

        return [...withoutDuplicate, nextPoint].slice(-HISTORY_LIMIT);
      });
    } catch (caughtError) {
      setAnalyticsError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown command center analytics error.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const analyticsTimer = window.setTimeout(() => {
      void loadAnalytics(currentIndex);
    }, 0);

    return () => {
      window.clearTimeout(analyticsTimer);
    };
  }, [currentIndex, loadAnalytics]);

  useEffect(() => {
    function handleSnapshot(event: Event): void {
      const customEvent = event as CustomEvent<{ index?: number }>;
      const nextIndex = customEvent.detail?.index;

      if (typeof nextIndex === "number") {
        void loadAnalytics(nextIndex);
      }
    }

    window.addEventListener(SNAPSHOT_EVENT, handleSnapshot);

    return () => {
      window.removeEventListener(SNAPSHOT_EVENT, handleSnapshot);
    };
  }, [loadAnalytics]);

  const domainData = useMemo(
    () =>
      analytics?.datasets.map((dataset) => ({
        ...dataset,
        presentation: normalizeDomain(dataset.datasetId),
      })) ?? [],
    [analytics],
  );

  const metricData = useMemo(
    () =>
      domainData
        .map((dataset) => {
          const metric = dataset.numericMetrics[0];

          return {
            domain: dataset.presentation.shortName,
            average: metric?.average ?? 0,
            field: metric ? titleCase(metric.field) : "No numeric metric",
            unit: metric ? metricUnit(metric.field) : "",
          };
        })
        .slice(0, 10),
    [domainData],
  );

  const domainAlertData = useMemo(
    () =>
      domainData
        .map((dataset) => ({
          domain: dataset.presentation.shortName,
          alerts: dataset.alertCount,
          rows: dataset.rowCount,
        }))
        .slice(0, 10),
    [domainData],
  );

  const progress = analytics?.progressPercent ?? 0;
  const runtimeHealthy = !error && !analyticsError;
  const isPlaying = status === "playing";

  return (
    <main
      id="lumi-main-content"
      className="min-h-screen overflow-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-12rem] left-[15%] h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute right-[5%] bottom-[-10rem] h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1800px] space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/65 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <motion.span
                  animate={
                    isPlaying
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(34,211,238,0.25)",
                            "0 0 0 10px rgba(34,211,238,0)",
                          ],
                        }
                      : undefined
                  }
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-cyan-200 uppercase"
                >
                  <Activity className="h-3.5 w-3.5" />
                  {status}
                </motion.span>

                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-semibold tracking-wider text-violet-200 uppercase">
                  Simulation only
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${
                    runtimeHealthy
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/30 bg-red-400/10 text-red-200"
                  }`}
                >
                  {runtimeHealthy ? "Runtime healthy" : "Runtime attention"}
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold tracking-[0.28em] text-cyan-300 uppercase">
                Autonomous Airport Infrastructure Intelligence Platform
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                LUMI Nexus Unified Command Center
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Live cross-domain operational visibility for synchronized
                airport Digital Twins, replay analytics, engineering agents,
                asset health and human-centred decision support.
              </p>
            </div>

            <div className="min-w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4 xl:min-w-[520px]">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs tracking-wider text-slate-500 uppercase">
                    Virtual timestamp
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {formatRuntimeTime(
                      timestamp ?? analytics?.timestamp ?? null,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs tracking-wider text-slate-500 uppercase">
                    Snapshot
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {currentIndex + 1} / {snapshotCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs tracking-wider text-slate-500 uppercase">
                    Progress
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {progress.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={isPlaying ? pause : play}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </button>

                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>

                <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                  Speed
                  <select
                    value={speed}
                    onChange={(event) => {
                      const nextSpeed = Number(event.target.value);

                      if (isNexusReplaySpeed(nextSpeed)) {
                        setSpeed(nextSpeed as NexusReplaySpeed);
                      }
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                  >
                    {NEXUS_REPLAY_SPEED_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </header>

        {(error || analyticsError) && (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
            {error ?? analyticsError}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <KpiCard
            label="Connected domains"
            value={analytics?.datasetCount ?? "—"}
            detail="Synchronized replay datasets"
            icon={<Network className="h-5 w-5" />}
          />
          <KpiCard
            label="Runtime rows"
            value={analytics?.totalRows ?? "—"}
            detail="Rows active at current timestamp"
            icon={<Database className="h-5 w-5" />}
          />
          <KpiCard
            label="Numeric metrics"
            value={analytics?.numericMetricCount ?? "—"}
            detail="Cross-domain measured values"
            icon={<Gauge className="h-5 w-5" />}
          />
          <KpiCard
            label="Active alerts"
            value={analytics?.totalAlerts ?? "—"}
            detail={`${analytics?.datasetsWithAlerts ?? 0} domains reporting attention`}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label="Alert rate"
            value={analytics ? `${analytics.alertPercent.toFixed(2)}%` : "—"}
            detail="Alert rows across current snapshot"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <KpiCard
            label="Replay speed"
            value={`${speed}×`}
            detail="Deterministic virtual-time acceleration"
            icon={<Zap className="h-5 w-5" />}
          />
          <KpiCard
            label="Snapshot index"
            value={currentIndex + 1}
            detail={`of ${snapshotCount} synchronized intervals`}
            icon={<Clock3 className="h-5 w-5" />}
          />
          <KpiCard
            label="Physical control"
            value="Disabled"
            detail="Engineering simulation safety boundary"
            icon={<Server className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="Cross-domain runtime activity"
            description="Rolling synchronized rows and numeric metrics across replay snapshots."
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="rowsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalRows"
                  name="Active rows"
                  stroke="#22d3ee"
                  fill="url(#rowsGradient)"
                  strokeWidth={2}
                  isAnimationActive
                />
                <Line
                  type="monotone"
                  dataKey="numericMetricCount"
                  name="Numeric metrics"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Alert timeline"
            description="Rolling alert count and alert percentage across the shared replay clock."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalAlerts"
                  name="Alerts"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                />
                <Line
                  type="monotone"
                  dataKey="alertPercent"
                  name="Alert rate %"
                  stroke="#fb7185"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Domain alert distribution"
            description="Current alert volume and active replay rows by operational domain."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainAlertData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="domain" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
                <Bar
                  dataKey="rows"
                  name="Rows"
                  fill="#0e7490"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                />
                <Bar
                  dataKey="alerts"
                  name="Alerts"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Primary domain metrics"
            description="First available numeric metric average from each synchronized dataset."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="domain" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                  formatter={(value, _name, item) => {
                    const payload = item.payload as {
                      field: string;
                      unit: string;
                    };

                    return [
                      `${Number(value).toFixed(2)} ${payload.unit}`,
                      payload.field,
                    ];
                  }}
                />
                <Bar
                  dataKey="average"
                  name="Average"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <NexusEngineeringAnalytics />

        <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Animated Domain Runtime Topology
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Domain nodes pulse while the shared replay runtime is active.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Last synchronized:{" "}
              {formatRuntimeTime(analytics?.timestamp ?? null)}
            </p>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.35)_1px,transparent_1px)] bg-[size:32px_32px]" />

            <div className="relative flex flex-col items-center gap-8">
              <motion.div
                animate={
                  isPlaying
                    ? {
                        scale: [1, 1.03, 1],
                        boxShadow: [
                          "0 0 20px rgba(34,211,238,0.15)",
                          "0 0 45px rgba(34,211,238,0.35)",
                          "0 0 20px rgba(34,211,238,0.15)",
                        ],
                      }
                    : undefined
                }
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-8 py-5 text-center"
              >
                <Network className="mx-auto h-7 w-7 text-cyan-300" />
                <p className="mt-2 font-semibold text-white">
                  LUMI Nexus Runtime
                </p>
                <p className="mt-1 text-xs text-cyan-200">
                  Snapshot {currentIndex + 1} • {speed}× • {status}
                </p>
              </motion.div>

              <motion.div
                animate={
                  isPlaying ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.35 }
                }
                transition={{ duration: 1.2, repeat: Infinity }}
                className="h-10 w-px bg-gradient-to-b from-cyan-400 to-violet-400"
              />

              <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {domainData.map((dataset, index) => (
                  <motion.article
                    key={dataset.datasetId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      boxShadow:
                        isPlaying && dataset.alertCount === 0
                          ? [
                              "0 0 0 rgba(34,197,94,0)",
                              "0 0 22px rgba(34,197,94,0.15)",
                              "0 0 0 rgba(34,197,94,0)",
                            ]
                          : undefined,
                    }}
                    transition={{
                      delay: index * 0.04,
                      boxShadow: {
                        duration: 2,
                        repeat: Infinity,
                      },
                    }}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">
                          {dataset.presentation.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {dataset.rowCount} rows • {dataset.numericMetricCount}{" "}
                          metrics
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusTone(
                          dataset.alertCount,
                        )}`}
                      >
                        {dataset.alertCount > 0
                          ? `${dataset.alertCount} alerts`
                          : "healthy"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {Object.entries(dataset.statusDistribution)
                        .slice(0, 4)
                        .map(([label, count]) => (
                          <span
                            key={label}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-400"
                          >
                            {titleCase(label)} {count}
                          </span>
                        ))}
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
            <h2 className="text-xl font-semibold text-white">
              Live Domain Intelligence
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Current synchronized status, alerts and primary measured values.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Domain</th>
                    <th className="px-3 py-3">Rows</th>
                    <th className="px-3 py-3">Alerts</th>
                    <th className="px-3 py-3">Status field</th>
                    <th className="px-3 py-3">Primary metric</th>
                    <th className="px-3 py-3">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {domainData.map((dataset) => {
                    const metric = dataset.numericMetrics[0];

                    return (
                      <tr
                        key={dataset.datasetId}
                        className="border-b border-slate-900"
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-200">
                            {dataset.presentation.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {dataset.datasetId}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-300">
                          {dataset.rowCount}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full border px-2 py-1 text-xs ${statusTone(dataset.alertCount)}`}
                          >
                            {dataset.alertCount}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {dataset.statusField
                            ? titleCase(dataset.statusField)
                            : "Not reported"}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {metric ? titleCase(metric.field) : "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-200">
                          {metric
                            ? `${metric.average.toFixed(2)} ${metricUnit(metric.field)}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
            <h2 className="text-xl font-semibold text-white">
              Runtime Diagnostics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Shared replay ownership and engineering safety boundary.
            </p>

            <div className="mt-5 space-y-3">
              {[
                ["Runtime owner", "NexusReplayRuntime"],
                ["Runtime host", "LumiGlobalRuntimes"],
                ["Replay mode", analytics?.runtimeMode ?? "dataset-replay"],
                ["Data origin", analytics?.dataOrigin ?? "simulated"],
                ["Physical control", "Disabled"],
                ["History buffer", `${history.length} / ${HISTORY_LIMIT}`],
                ["Current index", `${currentIndex} / ${snapshotCount - 1}`],
                [
                  "Analytics state",
                  loading
                    ? "Loading"
                    : analyticsError
                      ? "Error"
                      : "Synchronized",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-right text-sm font-medium text-slate-200">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/10 p-4">
              <p className="text-sm font-medium text-violet-200">
                Human-centred operational boundary
              </p>
              <p className="mt-2 text-xs leading-5 text-violet-200/70">
                Values are simulated. The Command Center provides engineering
                visibility and decision support only. Physical PLC, BMS, HVAC,
                power and airport safety commands remain disabled.
              </p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
