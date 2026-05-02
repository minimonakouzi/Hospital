import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Activity,
  AlertCircle,
  CalendarClock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

const API_BASE = "http://localhost:4000";
const ROLE_OPTIONS = ["admin", "staff", "nurse", "doctor", "system"];

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleize(value = "") {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actorLabel(log = {}) {
  return log.actorName || log.actorEmail || log.actorId || "Unknown actor";
}

function entityLabel(log = {}) {
  const type = titleize(log.entityType || "Entity");
  return log.entityId ? `${type} #${String(log.entityId).slice(-6)}` : type;
}

function detailsLabel(details = {}) {
  if (!details || typeof details !== "object") return "";
  const entries = Object.entries(details).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  return entries
    .map(([key, value]) => `${titleize(key)}: ${String(value)}`)
    .join(" | ");
}

function RoleBadge({ role }) {
  const normalized = role || "system";
  const classes =
    normalized === "admin"
      ? "bg-blue-50 text-blue-700 ring-blue-100"
      : normalized === "staff"
        ? "bg-cyan-50 text-cyan-700 ring-cyan-100"
        : normalized === "nurse"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-50 text-slate-600 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${classes}`}>
      {normalized}
    </span>
  );
}

export default function AuditLogs() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [query, setQuery] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");
      const params = new URLSearchParams({ limit: "150" });

      const res = await fetch(`${API_BASE}/api/audit-logs?${params.toString()}`, {
        headers: await adminAuthHeaders(getToken),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to load audit logs.");
      }

      setLogs(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error("load audit logs error:", err);
      setLogs([]);
      setMessage(err?.message || "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const actionOptions = useMemo(() => {
    return [...new Set(logs.map((log) => log.action).filter(Boolean))].sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs
      .filter((log) => (roleFilter ? log.actorRole === roleFilter : true))
      .filter((log) => (actionFilter ? log.action === actionFilter : true))
      .filter((log) => {
        if (!q) return true;
        return [
          actorLabel(log),
          log.actorRole,
          log.action,
          log.entityType,
          log.entityId,
          detailsLabel(log.details),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [actionFilter, logs, query, roleFilter]);

  return (
    <AdminLayout
      title="Audit Logs"
      subtitle="Review important admin, staff, and nurse activity"
    >
      <div className="mx-auto grid max-w-7xl gap-5">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                placeholder="Search actor, action, entity, details..."
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="">All roles</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {titleize(role)}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {titleize(action)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadLogs}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        {message ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {message}
          </div>
        ) : null}

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-16 text-sm font-semibold text-blue-700">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No audit logs found
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Important actions will appear here as they happen.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Time</th>
                      <th className="px-5 py-4">Actor</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Action</th>
                      <th className="px-5 py-4">Entity</th>
                      <th className="px-5 py-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="align-top text-sm text-slate-600">
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                          {formatTime(log.timestamp)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{actorLabel(log)}</div>
                          {log.actorEmail && log.actorName ? (
                            <div className="mt-0.5 text-xs text-slate-500">{log.actorEmail}</div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <RoleBadge role={log.actorRole} />
                        </td>
                        <td className="px-5 py-4 font-semibold text-blue-700">
                          {titleize(log.action)}
                        </td>
                        <td className="px-5 py-4">{entityLabel(log)}</td>
                        <td className="max-w-md px-5 py-4 text-xs leading-5 text-slate-500">
                          {detailsLabel(log.details) || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredLogs.map((log) => (
                  <article key={log._id} className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                          <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
                          {formatTime(log.timestamp)}
                        </div>
                        <h2 className="mt-2 truncate text-base font-bold text-slate-900">
                          {titleize(log.action)}
                        </h2>
                      </div>
                      <RoleBadge role={log.actorRole} />
                    </div>

                    <div className="grid gap-2 rounded-2xl bg-[#f8fbff] p-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Activity className="h-4 w-4 text-blue-600" />
                        {actorLabel(log)}
                      </div>
                      <div>{entityLabel(log)}</div>
                      <div className="text-xs leading-5 text-slate-500">
                        {detailsLabel(log.details) || "-"}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
