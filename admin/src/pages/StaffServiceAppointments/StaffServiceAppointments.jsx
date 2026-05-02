import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FlaskConical,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Timer,
  UserRound,
} from "lucide-react";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";

const API_BASE = "http://localhost:4000";
const STAFF_TOKEN_KEY = "staffToken_v1";
const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Cancelled"];

function formatDate(value = "") {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(item = {}) {
  const hour = Number(item.hour);
  const minute = Number(item.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !item.ampm) {
    return "-";
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${item.ampm}`;
}

function displayStatus(status = "") {
  return status === "Canceled" ? "Cancelled" : status || "Pending";
}

function isFinalizedStatus(status = "") {
  const normalized = displayStatus(status);
  return normalized === "Completed" || normalized === "Cancelled";
}

function statusTone(status = "") {
  const normalized = displayStatus(status);
  if (normalized === "Completed") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (normalized === "Confirmed" || normalized === "In Progress") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (normalized === "Cancelled") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (normalized === "Pending") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(status)}`}>
      {displayStatus(status)}
    </span>
  );
}

function PrescriptionBadge({ status = "Not Required" }) {
  const tone =
    status === "Submitted"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "Missing" || status === "Required"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${tone}`}>
      Prescription {status}
    </span>
  );
}

export default function StaffServiceAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const token = localStorage.getItem(STAFF_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/api/service-appointments/staff?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to load service appointments.");
      }

      setAppointments(Array.isArray(body?.appointments) ? body.appointments : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("fetch staff service appointments error:", err);
      setAppointments([]);
      setMessage({
        type: "error",
        text: err?.message || "Unable to load service appointments.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments
      .filter((item) =>
        statusFilter === "all" ? true : displayStatus(item.status) === statusFilter,
      )
      .filter((item) => {
        if (!q) return true;
        return [
          item.patientName,
          item.mobile,
          item.serviceName,
          item.serviceId?.name,
          item.status,
          item.payment?.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [appointments, query, statusFilter]);

  async function updateStatus(item, nextStatus) {
    const id = item._id || item.id;
    if (!id || displayStatus(item.status) === nextStatus) return;
    if (isFinalizedStatus(item.status)) {
      setMessage({
        type: "error",
        text: "This appointment is already finalized and cannot be changed.",
      });
      return;
    }

    if (
      nextStatus === "Cancelled" &&
      !window.confirm("Mark this service appointment as Cancelled?")
    ) {
      return;
    }

    try {
      setUpdatingId(id);
      setMessage({ type: "", text: "" });
      const token = localStorage.getItem(STAFF_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to update appointment status.");
      }

      setAppointments((prev) =>
        prev.map((appointment) =>
          (appointment._id || appointment.id) === id
            ? { ...appointment, status: body?.data?.status || nextStatus }
            : appointment,
        ),
      );
      setLastUpdated(new Date());
      setMessage({
        type: "success",
        text: body?.message || `Service appointment marked ${nextStatus}.`,
      });
    } catch (err) {
      console.error("update service appointment status error:", err);
      setMessage({
        type: "error",
        text: err?.message || "Unable to update appointment status.",
      });
    } finally {
      setUpdatingId("");
    }
  }

  const appointmentStats = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    return [
      {
        label: "Total Appointments",
        value: appointments.length,
        icon: CalendarDays,
        tone: "bg-blue-50 text-blue-700 ring-blue-100",
      },
      {
        label: "Today",
        value: appointments.filter((item) => item.date === todayISO).length,
        icon: Timer,
        tone: "bg-indigo-50 text-indigo-700 ring-indigo-100",
      },
      {
        label: "Pending Requests",
        value: appointments.filter(
          (item) => displayStatus(item.status) === "Pending",
        ).length,
        icon: Clock3,
        tone: "bg-amber-50 text-amber-700 ring-amber-100",
      },
      {
        label: "Completed",
        value: appointments.filter(
          (item) => displayStatus(item.status) === "Completed",
        ).length,
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      },
    ];
  }, [appointments]);

  function formatLastUpdated(value) {
    if (!value) return "Last updated after appointments load";
    return `Last updated ${value.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return (
    <div>
      <StaffPageHeader
        title="Service Appointments"
        subtitle="Manage service and lab booking statuses."
        breadcrumb="Staff Portal / Appointments"
        action={
          <button
            type="button"
            onClick={fetchAppointments}
            className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {appointmentStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${stat.tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Appointment Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Search and update service booking statuses.
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {formatLastUpdated(lastUpdated)}
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                  placeholder="Search patient, service, phone..."
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {message.text ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                message.type === "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-rose-100 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
            {loading ? (
              <div className="px-4 py-8 sm:px-6">
                <div className="mb-5 flex items-center text-sm font-semibold text-blue-700">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading service appointments...
                </div>
                <div className="grid gap-3">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                  <FlaskConical className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  No service appointments found
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  New service bookings will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAppointments.map((item) => {
                  const id = item._id || item.id;
                  const finalized = isFinalizedStatus(item.status);
                  return (
                    <article
                      key={id}
                      className="p-4 transition duration-200 hover:bg-[#f8fbff] sm:p-5"
                    >
                      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_0.8fr_240px] xl:items-center">
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                              <UserRound className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900">
                                {item.patientName || "Unnamed patient"}
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-blue-700">
                                {item.serviceName || item.serviceId?.name || "Service booking"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-3 xl:grid-cols-1">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate">{formatDate(item.date)}</span>
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <Clock3 className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate">{formatTime(item)}</span>
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate">{item.mobile || "No mobile"}</span>
                          </span>
                        </div>

                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={item.status} />
                            <PrescriptionBadge status={item.prescriptionStatus || "Not Required"} />
                            {finalized ? (
                              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
                                Finalized
                              </span>
                            ) : null}
                          </div>
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                            Payment: {item.payment?.status || "Pending"}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <select
                            value={displayStatus(item.status)}
                            disabled={updatingId === id || finalized}
                            onChange={(e) => updateStatus(item, e.target.value)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white disabled:opacity-70"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {updatingId === id && displayStatus(item.status) !== status
                                  ? "Saving..."
                                  : status}
                              </option>
                            ))}
                          </select>
                          {finalized ? (
                            <p className="mt-2 text-xs font-semibold text-blue-700">
                              Finalized appointments cannot be changed.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
