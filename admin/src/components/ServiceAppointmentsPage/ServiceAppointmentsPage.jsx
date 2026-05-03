import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

const API_BASE = "http://localhost:4000";
const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "In Progress", label: "In Progress" },
  { value: "Rescheduled", label: "Rescheduled" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Canceled" },
];
const PAGE_SIZES = [25, 50, 100];

function formatTwo(n) {
  return String(n).padStart(2, "0");
}

function formatDateNice(dateStr) {
  if (!dateStr) return "Not scheduled";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseTimeToParts(timeStr) {
  if (!timeStr) return { hour: 12, minute: 0, ampm: "AM" };

  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (m) {
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const ampm = m[3] ? m[3].toUpperCase() : null;

    if (!ampm) {
      const hour12 = hh % 12 === 0 ? 12 : hh % 12;
      return { hour: hour12, minute: mm, ampm: hh >= 12 ? "PM" : "AM" };
    }

    return { hour: hh, minute: mm, ampm };
  }

  return { hour: 12, minute: 0, ampm: "AM" };
}

function timePartsToInputValue(a) {
  const hour = Number(a.hour || 0);
  const minute = Number(a.minute || 0);
  let hh24 = hour % 12;

  if ((a.ampm || "AM").toUpperCase() === "PM") hh24 += 12;
  if (a.ampm === "AM" && hour === 12) hh24 = 0;
  if (a.ampm === "PM" && hour === 12) hh24 = 12;

  return `${formatTwo(hh24)}:${formatTwo(minute)}`;
}

function formatTimeDisplay(a) {
  return `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`;
}

function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isDateBefore(aDateStr, bDateStr) {
  try {
    const a = new Date(`${aDateStr}T00:00:00`);
    const b = new Date(`${bDateStr}T00:00:00`);
    return a.getTime() < b.getTime();
  } catch {
    return false;
  }
}

function extractUpdated(body) {
  return body?.data || body?.appointment || body?.item || body || {};
}

function statusClasses(status) {
  const s = (status || "").toLowerCase();
  if (s === "confirmed") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (s === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "rescheduled") return "border-violet-200 bg-violet-50 text-violet-700";
  if (s === "canceled" || s === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "in progress") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function prescriptionClasses(status = "Not Required") {
  if (status === "Submitted") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Missing" || status === "Required") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function isFinalStatus(status = "") {
  return status === "Completed" || status === "Canceled" || status === "Cancelled";
}

function displayStatus(status = "") {
  return status === "Cancelled" ? "Canceled" : status;
}

function backendStatusValue(status = "") {
  return status === "Canceled" ? "Cancelled" : status;
}

function normalizeServiceAppointment(a) {
  let timeStr = "";

  if (a.time) {
    timeStr = a.time;
  } else if (
    a.hour !== undefined &&
    a.minute !== undefined &&
    a.ampm !== undefined
  ) {
    timeStr = `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`;
  } else if (a.rescheduledTo?.time) {
    timeStr = a.rescheduledTo.time;
  }

  const parsed = parseTimeToParts(timeStr);

  return {
    id: a._id || a.id,
    patientName: a.patientName || "",
    mobile: a.mobile || "",
    age: a.age || "",
    gender: a.gender || "",
    serviceName: a.serviceName || "Service",
    fees: a.fees ?? a.payment?.amount ?? a.raw?.fees ?? 0,
    date: a.date || a.rescheduledTo?.date || "",
    hour: parsed.hour,
    minute: parsed.minute,
    ampm: parsed.ampm,
    status: a.status || "Pending",
    prescriptionStatus: a.prescriptionStatus || "Not Required",
    raw: a,
  };
}

function Toasts({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 space-y-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex min-w-[280px] items-start gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-lg"
        >
          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">{t.title}</div>
            <div className="mt-1 text-xs text-slate-500">{t.message}</div>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function StatusSelect({ appointment, onChange, disabled }) {
  const terminal = isFinalStatus(appointment.status);

  return (
    <div className="relative w-40">
      <select
        value={backendStatusValue(appointment.status)}
        onChange={(e) => onChange(e.target.value)}
        disabled={terminal || disabled}
        className={`admin-select h-10 rounded-xl ${
          terminal ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : ""
        }`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function ReschedulePanel({ appointment, onReschedule, disabled }) {
  const terminal = isFinalStatus(appointment.status);
  const [editing, setEditing] = useState(false);
  const todayISO = getTodayISO();

  const [date, setDate] = useState(appointment.date || todayISO);
  const [time, setTime] = useState(timePartsToInputValue(appointment));

  useEffect(() => {
    const baseDate = appointment.date || "";
    const initialDate =
      baseDate && !isDateBefore(baseDate, todayISO) ? baseDate : todayISO;
    setDate(initialDate);
    setTime(timePartsToInputValue(appointment));
  }, [
    appointment.date,
    appointment.hour,
    appointment.minute,
    appointment.ampm,
    todayISO,
  ]);

  function save() {
    if (!date || !time) return;

    if (isDateBefore(date, getTodayISO())) {
      alert("Please choose today or a future date for rescheduling.");
      return;
    }

    onReschedule(date, time);
    setEditing(false);
  }

  function cancel() {
    const baseDate = appointment.date || "";
    const restoreDate =
      baseDate && !isDateBefore(baseDate, getTodayISO()) ? baseDate : getTodayISO();

    setDate(restoreDate);
    setTime(timePartsToInputValue(appointment));
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        disabled={terminal || disabled}
        className={`h-10 rounded-xl border px-3 text-sm font-medium transition ${
          terminal || disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
      >
        Reschedule
      </button>
    );
  }

  return (
    <div className="min-w-[270px] rounded-2xl border border-blue-100 bg-blue-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          min={getTodayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
        />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={cancel}
          className="h-9 rounded-xl bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
        <button
          onClick={save}
          className="h-9 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function ServiceAppointmentsPage() {
  const { getToken } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, count: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, pageSize]);

  function pushToast(title, message) {
    const toastId = Date.now() + Math.random();
    setToasts((t) => [...t, { id: toastId, title, message }]);
  }

  function removeToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(
        `${API_BASE}/api/service-appointments?${params.toString()}`,
        {
          headers: await adminAuthHeaders(getToken),
        },
      );

      if (!res.ok) throw new Error("Unable to load service appointments right now.");

      const body = await res.json();

      let list = [];
      if (Array.isArray(body.appointments)) list = body.appointments;
      else if (Array.isArray(body.data)) list = body.data;
      else if (Array.isArray(body.items)) list = body.items;
      else if (Array.isArray(body)) list = body;

      const normalized = (Array.isArray(list) ? list : []).map(normalizeServiceAppointment);

      setAppointments(normalized);
      setMeta({
        page: body?.meta?.page || page,
        limit: body?.meta?.limit || pageSize,
        total: body?.meta?.total || normalized.length,
        count: body?.meta?.count || normalized.length,
      });
    } catch (err) {
      console.error("fetchAppointments:", err);
      setError(err.message || "Unable to load service appointments right now.");
      setAppointments([]);
      setMeta((current) => ({ ...current, count: 0 }));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, getToken, page, pageSize, statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function changeStatusRemote(id, newStatus) {
    const old = appointments.find((a) => a.id === id);
    if (!old) return;

    setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
    );

    pushToast("Updating status", "Appointment status is updating.");

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
        method: "PUT",
        headers: await adminAuthHeaders(getToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Unable to update appointment status.");

      const body = await res.json();
      const updated = extractUpdated(body);
      const parsed = parseTimeToParts(
        updated.time ||
          updated.rescheduledTo?.time ||
          `${formatTwo(old.hour)}:${formatTwo(old.minute)} ${old.ampm}`,
      );

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: updated.status || newStatus,
                date: updated.date || updated.rescheduledTo?.date || a.date,
                hour: parsed.hour,
                minute: parsed.minute,
                ampm: parsed.ampm,
                raw: updated || a.raw,
              }
            : a,
        ),
      );

      pushToast("Status updated", "Appointment updated successfully.");
    } catch (err) {
      console.error("changeStatusRemote:", err);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: old.status } : a)),
      );
      pushToast("Update failed", "Unable to update appointment status.");
    }
  }

  async function rescheduleRemote(id, dateStr, time24) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;

    const [hh, mm] = time24.split(":").map(Number);
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    const ampm = hh >= 12 ? "PM" : "AM";
    const timeStr = `${formatTwo(hour12)}:${formatTwo(mm)} ${ampm}`;

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              date: dateStr,
              hour: hour12,
              minute: mm,
              ampm,
              status: "Rescheduled",
            }
          : a,
      ),
    );

    pushToast("Rescheduling", `Moving appointment to ${formatDateNice(dateStr)} ${timeStr}.`);

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
        method: "PUT",
        headers: await adminAuthHeaders(getToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          rescheduledTo: { date: dateStr, time: timeStr },
          status: "Rescheduled",
        }),
      });

      if (!res.ok) throw new Error("Unable to reschedule appointment.");

      const body = await res.json();
      const updated = extractUpdated(body);
      const finalDate = updated.date || updated.rescheduledTo?.date || dateStr || appt.date;
      const finalTimeStr =
        updated.time ||
        updated.rescheduledTo?.time ||
        timeStr ||
        `${formatTwo(appt.hour)}:${formatTwo(appt.minute)} ${appt.ampm}`;
      const parsed = parseTimeToParts(finalTimeStr);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                date: finalDate,
                hour: parsed.hour,
                minute: parsed.minute,
                ampm: parsed.ampm,
                status: updated.status || "Rescheduled",
                raw: updated || a.raw,
              }
            : a,
        ),
      );

      pushToast("Rescheduled", `Appointment moved to ${formatDateNice(finalDate)} ${finalTimeStr}.`);
    } catch (err) {
      console.error("rescheduleRemote:", err);
      pushToast("Reschedule failed", "Unable to reschedule appointment. Reloading.");
      await fetchAppointments();
    }
  }

  async function cancelRemote(id) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt || isFinalStatus(appt.status)) return;

    if (
      !window.confirm(
        `Cancel appointment for ${appt.patientName || "this patient"} on ${formatDateNice(
          appt.date,
        )}?`,
      )
    ) {
      return;
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Cancelled" } : a)),
    );

    pushToast("Canceling", "Appointment is being canceled.");

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}/cancel`, {
        method: "POST",
        headers: await adminAuthHeaders(getToken, {
          "Content-Type": "application/json",
        }),
      });

      if (!res.ok) throw new Error("Unable to cancel appointment.");

      const body = await res.json();
      const updated = extractUpdated(body);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: updated.status || "Cancelled",
                raw: updated || a.raw,
              }
            : a,
        ),
      );

      pushToast("Canceled", "Appointment canceled successfully.");
    } catch (err) {
      console.error("cancelRemote:", err);
      pushToast("Cancel failed", "Unable to cancel appointment. Reloading.");
      await fetchAppointments();
    }
  }

  async function deleteRemote(id) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;

    if (
      !window.confirm(
        "This will permanently delete this appointment record from history. Continue?",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
        method: "DELETE",
        headers: await adminAuthHeaders(getToken),
      });

      if (!res.ok) throw new Error("Unable to delete appointment record.");

      pushToast("Deleted", "Appointment record deleted successfully.");

      if (appointments.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await fetchAppointments();
      }
    } catch (err) {
      console.error("deleteRemote:", err);
      pushToast("Delete failed", "Unable to delete appointment record.");
    }
  }

  const sortedAppointments = useMemo(() => appointments, [appointments]);
  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / pageSize));
  const pageStart = meta.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, meta.total || 0);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <Toasts toasts={toasts} removeToast={removeToast} />

      <section className="rounded-3xl border border-[#dbe6f7] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight text-slate-900">
              Service Appointments
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage service bookings, status updates, and reschedules.
            </p>
          </div>

          <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dbe6f7] bg-[#eef4fb] px-4 text-sm font-medium text-[#2563eb]">
            <ShieldCheck className="h-4 w-4" />
            Secure Admin Session
          </div>
        </div>

        <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, phone, or notes"
              className="admin-input h-12 pl-11"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[170px_auto_auto]">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-select h-12"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              onClick={clearFilters}
              className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Clear
            </button>

            <button
              onClick={fetchAppointments}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf2fb] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Service Appointment Queue
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing {pageStart}-{pageEnd} of {meta.total}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-500">
            Rows
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="admin-select h-10 w-24 rounded-xl"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading appointments...</div>
        ) : sortedAppointments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No service appointments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1060px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#f8fbff] text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Date / Time</th>
                  <th className="px-5 py-3">Fee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Prescription</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2fb]">
                {sortedAppointments.map((a) => {
                  const terminal = isFinalStatus(a.status);

                  return (
                    <tr key={a.id} className="align-middle transition hover:bg-[#f8fbff]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">
                              {a.patientName || "Unknown Patient"}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                              <span>
                                {a.age ? `${a.age} yrs` : "Age N/A"}
                                {a.gender ? ` / ${a.gender}` : ""}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {a.mobile || "No phone"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {a.serviceName}
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 font-medium text-slate-800">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          {formatDateNice(a.date)}
                        </div>
                        <div className="mt-1 pl-6 text-xs text-slate-500">
                          {formatTimeDisplay(a)}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        ${a.fees || 0}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                            a.status,
                          )}`}
                        >
                          {displayStatus(a.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex max-w-[180px] rounded-full border px-2.5 py-1 text-xs font-medium ${prescriptionClasses(
                            a.prescriptionStatus,
                          )}`}
                        >
                          <span className="truncate">{a.prescriptionStatus}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <StatusSelect
                            appointment={a}
                            onChange={(value) => changeStatusRemote(a.id, value)}
                            disabled={loading}
                          />

                          <ReschedulePanel
                            appointment={a}
                            onReschedule={(date, time) => rescheduleRemote(a.id, date, time)}
                            disabled={loading}
                          />

                          <button
                            onClick={() => cancelRemote(a.id)}
                            disabled={terminal || loading}
                            className={`h-10 rounded-xl border px-3 text-sm font-medium transition ${
                              terminal || loading
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            Cancel
                          </button>

                          <button
                            onClick={() => deleteRemote(a.id)}
                            disabled={loading}
                            className="h-10 rounded-xl border border-red-200 bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-[#edf2fb] px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
