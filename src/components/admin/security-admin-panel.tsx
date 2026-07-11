"use client";

import {
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useState } from "react";

import type { PublicSecurityUser } from "@/types/security";

interface SecurityConfiguration {
  sessionDurationHours: number;
  minimumPasswordLength: number;
  maximumLoginAttempts: number;
  loginRateLimitPerMinute: number;
  secureCookies: boolean;
  sessionSecretConfigured: boolean;
  initialAdminEmailConfigured: boolean;
}

export function SecurityAdminPanel() {
  const [users, setUsers] = useState<PublicSecurityUser[]>([]);

  const [configuration, setConfiguration] =
    useState<SecurityConfiguration | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  async function loadSecurityData() {
    setLoading(true);
    setMessage(null);

    try {
      const [usersResponse, configurationResponse] = await Promise.all([
        fetch("/api/admin/users", {
          cache: "no-store",
        }),
        fetch("/api/admin/security", {
          cache: "no-store",
        }),
      ]);

      if (
        usersResponse.status === 401 ||
        configurationResponse.status === 401
      ) {
        setMessage("Administrator authentication is required.");

        return;
      }

      const usersResult = (await usersResponse.json()) as {
        success: boolean;
        users?: PublicSecurityUser[];
        error?: string;
      };

      const configurationResult = (await configurationResponse.json()) as {
        success: boolean;
        configuration?: SecurityConfiguration;
        error?: string;
      };

      if (!usersResult.success || !configurationResult.success) {
        throw new Error(
          usersResult.error ??
            configurationResult.error ??
            "Security data could not be loaded.",
        );
      }

      setUsers(usersResult.users ?? []);

      setConfiguration(configurationResult.configuration ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Security data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={21} className="text-emerald-300" />

            <h2 className="text-lg font-semibold text-white">
              Enterprise Security Administration
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            RBAC, sessions, user access and security policy
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSecurityData()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Load security data
        </button>
      </header>

      <div className="space-y-6 p-5">
        {message ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {message}
          </div>
        ) : null}

        {configuration ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <LockKeyhole size={18} className="text-cyan-300" />

              <p className="mt-3 text-xs text-slate-500">Session duration</p>

              <p className="mt-1 text-xl font-semibold text-white">
                {configuration.sessionDurationHours} hours
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <KeyRound size={18} className="text-violet-300" />

              <p className="mt-3 text-xs text-slate-500">Minimum password</p>

              <p className="mt-1 text-xl font-semibold text-white">
                {configuration.minimumPasswordLength} characters
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <ShieldCheck size={18} className="text-emerald-300" />

              <p className="mt-3 text-xs text-slate-500">Session secret</p>

              <p className="mt-1 text-xl font-semibold text-white">
                {configuration.sessionSecretConfigured
                  ? "Configured"
                  : "Development fallback"}
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <Users size={18} className="text-amber-300" />

              <p className="mt-3 text-xs text-slate-500">Registered users</p>

              <p className="mt-1 text-xl font-semibold text-white">
                {users.length}
              </p>
            </article>
          </section>
        ) : null}

        {users.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">User</th>

                  <th className="px-4 py-3">Role</th>

                  <th className="px-4 py-3">Status</th>

                  <th className="px-4 py-3">Permissions</th>

                  <th className="px-4 py-3">Last login</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {user.displayName}
                      </p>

                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>

                    <td className="px-4 py-3 text-slate-300 capitalize">
                      {user.role}
                    </td>

                    <td className="px-4 py-3 text-slate-300 capitalize">
                      {user.status}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {user.permissions.length}
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString()
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
