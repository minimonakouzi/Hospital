import React, { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Calendar,
  Check,
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

/* ----------------------
  Config
------------------------ */
const API_BASE = "http://localhost:4000";

/* ----------------------
  Helpers
------------------------ */
function formatTwo(n) {
  return String(n).padStart(2, "0");
}

function formatDateNice(dateStr) {
  if (!dateStr) return "";
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
    let hh = Number(m[1]);
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

function getTimestamp(a) {
  try {
    const [y, m, d] = (a.date || "1970-01-01").split("-").map(Number);
    let hour = Number(a.hour) || 0;
    const minute = Number(a.minute) || 0;
    const ampm = (a.ampm || "AM").toUpperCase();

    if (ampm === "AM" && hour === 12) hour = 0;
    else if (ampm === "PM" && hour !== 12) hour += 12;

    return new Date(y, (m || 1) - 1, d || 1, hour, minute, 0, 0).getTime();
  } catch {
    return 0;
  }
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function extractUpdated(body) {
  return body?.data || body?.appointment || body?.item || body || {};
}

function statusClasses(status) {
  const s = (status || "").toLowerCase();
  if (s === "confirmed") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }
  if (s === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (s === "rescheduled") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (s === "canceled" || s === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function prescriptionClasses(status = "Not Required") {
  if (status === "Submitted") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Missing" || status === "Required") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

/* ----------------------
  Toast
------------------------ */
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
            <div className="text-sm font-semibold text-slate-900">
              {t.title}
            </div>
            <div className="mt-1 text-xs text-slate-500">{t.message}</div>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close toast"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/* ----------------------
  Status Select
------------------------ */
function StatusSelect({ appointment, onChange, disabled }) {
  const terminal =
    appointment.status === "Completed" || appointment.status === "Canceled";

  const options = ["Pending", "Confirmed", "Completed", "Canceled"];

  return (
    <div className="relative">
      <select
        value={appointment.status}
        onChange={(e) => onChange(e.target.value)}
        disabled={terminal || disabled}
        className={`h-11 w-full appearance-none rounded-2xl border px-4 pr-10 text-sm font-semibold outline-none transition ${
          terminal
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-blue-100 bg-white text-slate-700 focus:border-blue-300"
        }`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

/* ----------------------
  Reschedule Button
------------------------ */
function ReschedulePanel({ appointment, onReschedule, disabled }) {
  const terminal =
    appointment.status === "Completed" || appointment.status === "Canceled";
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
      baseDate && !isDateBefore(baseDate, getTodayISO())
        ? baseDate
        : getTodayISO();

    setDate(restoreDate);
    setTime(timePartsToInputValue(appointment));
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        disabled={terminal || disabled}
        className={`h-11 rounded-2xl border px-4 text-sm font-semibold transition ${
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
    <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
      <input
        type="date"
        value={date}
        min={getTodayISO()}
        onChange={(e) => setDate(e.target.value)}
        className="h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
      />

      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={save}
          className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={cancel}
          className="h-10 rounded-xl bg-rose-50 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ----------------------
  Main Component
------------------------ */
export default function ServiceAppointmentsPage() {
  const { getToken } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  function pushToast(title, message) {
    const toastId = Date.now() + Math.random();
    setToasts((t) => [...t, { id: toastId, title, message }]);
  }

  function removeToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  async function fetchAppointments() {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/api/service-appointments?limit=500`;
      const res = await fetch(url, {
        headers: await adminAuthHeaders(getToken),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || `Failed to fetch appointments (${res.status})`,
        );
      }

      const body = await res.json();

      let list = [];
      if (Array.isArray(body.appointments)) list = body.appointments;
      else if (Array.isArray(body.data)) list = body.data;
      else if (Array.isArray(body.items)) list = body.items;
      else if (Array.isArray(body)) list = body;

      const normalized = (Array.isArray(list) ? list : []).map((a) => {
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
      });

      setAppointments(normalized);
    } catch (err) {
      console.error("fetchAppointments:", err);
      setError(err.message || "Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatusRemote(id, newStatus) {
    const old = appointments.find((a) => a.id === id);
    if (!old) return;

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
    );

    pushToast("Updating status", `Appointment #${id} → ${newStatus}`);

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Update failed (${res.status})`);
      }

      const body = await res.json();
      const updated = extractUpdated(body);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: updated.status || newStatus,
                date: updated.date || updated.rescheduledTo?.date || a.date,
                hour: parseTimeToParts(
                  updated.time ||
                    updated.rescheduledTo?.time ||
                    `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`,
                ).hour,
                minute: parseTimeToParts(
                  updated.time ||
                    updated.rescheduledTo?.time ||
                    `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`,
                ).minute,
                ampm: parseTimeToParts(
                  updated.time ||
                    updated.rescheduledTo?.time ||
                    `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`,
                ).ampm,
                raw: updated || a.raw,
              }
            : a,
        ),
      );

      pushToast("Status updated", `Appointment #${id} is now ${newStatus}`);
    } catch (err) {
      console.error("changeStatusRemote:", err);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: old.status } : a)),
      );
      pushToast("Update failed", err.message || "Failed to update status");
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

    pushToast(
      "Rescheduling",
      `Appointment #${id} → ${formatDateNice(dateStr)} ${timeStr}`,
    );

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rescheduledTo: { date: dateStr, time: timeStr },
          status: "Rescheduled",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Reschedule failed (${res.status})`);
      }

      const body = await res.json();
      const updated = extractUpdated(body);

      const finalDate =
        updated.date || updated.rescheduledTo?.date || dateStr || appt.date;

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

      pushToast(
        "Rescheduled",
        `Appointment #${id} moved to ${formatDateNice(finalDate)} ${finalTimeStr}`,
      );
    } catch (err) {
      console.error("rescheduleRemote:", err);
      pushToast(
        "Reschedule failed",
        err.message || "Failed to reschedule — reloading",
      );
      await fetchAppointments();
    }
  }

  async function cancelRemote(id) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    if (appt.status === "Canceled") return;

    if (
      !window.confirm(
        `Mark appointment for ${appt.patientName} on ${formatDateNice(
          appt.date,
        )} as CANCELED?`,
      )
    ) {
      return;
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Canceled" } : a)),
    );

    pushToast("Canceling", `Appointment #${id} is being canceled`);

    try {
      const res = await fetch(
        `${API_BASE}/api/service-appointments/${id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Cancel failed (${res.status})`);
      }

      const body = await res.json();
      const updated = extractUpdated(body);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: updated.status || "Canceled",
                raw: updated || a.raw,
              }
            : a,
        ),
      );

      pushToast("Canceled", `Appointment #${id} canceled`);
    } catch (err) {
      console.error("cancelRemote:", err);
      pushToast("Cancel failed", err.message || "Failed to cancel — reloading");
      await fetchAppointments();
    }
  }

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();

    return appointments
      .filter((a) =>
        q
          ? (a.patientName || "").toLowerCase().includes(q) ||
            (a.serviceName || "").toLowerCase().includes(q)
          : true,
      )
      .filter((a) => (statusFilter ? a.status === statusFilter : true))
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [appointments, debouncedSearch, statusFilter]);

  const displayed = useMemo(
    () => (showAll ? filtered : filtered.slice(0, 8)),
    [filtered, showAll],
  );

  return (
    <div className="space-y-6">
      <Toasts toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <section className="rounded-3xl border border-[#dbe6f7] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight text-slate-900">
              Appointments
            </h1>
            <p className="mt-1 text-sm italic text-slate-500">
              Manage patient bookings — quick search & status controls
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowAll(false);
                }}
                placeholder="Search by patient or service"
                className="h-12 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              />
            </div>

            <div className="relative min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setShowAll(false);
                }}
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300"
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Completed">Completed</option>
                <option value="Canceled">Canceled</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setShowAll(false);
              }}
              className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {filtered.length} Results
          </div>

          <button
            onClick={fetchAppointments}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      {/* State */}
      {loading && (
        <div className="rounded-3xl border border-[#dbe6f7] bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading appointments...
        </div>
      )}

      {error && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {displayed.length === 0 ? (
            <div className="rounded-3xl border border-[#dbe6f7] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              No appointments found.
            </div>
          ) : (
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {displayed.map((a) => {
                const terminal =
                  a.status === "Completed" || a.status === "Canceled";

                return (
                  <article
                    key={a.id}
                    className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    {/* Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <User className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-bold text-slate-900">
                            {a.patientName || "Unknown"}
                          </h3>
                          <div className="mt-1 text-xs font-medium text-slate-400">
                            {a.gender || "Unknown"}{" "}
                            {a.age ? `• ${a.age} yrs` : ""}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${statusClasses(
                          a.status,
                        )}`}
                      >
                        {a.status}
                      </div>
                      <div
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${prescriptionClasses(
                          a.prescriptionStatus,
                        )}`}
                      >
                        Prescription {a.prescriptionStatus}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="mt-5 space-y-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <span>{a.mobile || "No phone"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span>Fees: ${a.fees}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>Date: {formatDateNice(a.date)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 rotate-90 text-blue-600" />
                        <span>Time: {formatTimeDisplay(a)}</span>
                      </div>
                    </div>

                    {/* Service */}
                    <div className="mt-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Service
                      </div>
                      <div className="mt-2 text-xl font-bold text-blue-700">
                        {a.serviceName}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-5 space-y-3">
                      <StatusSelect
                        appointment={a}
                        onChange={(value) => changeStatusRemote(a.id, value)}
                        disabled={loading}
                      />

                      <div className="grid grid-cols-[1fr_auto] gap-3">
                        <ReschedulePanel
                          appointment={a}
                          onReschedule={(date, time) =>
                            rescheduleRemote(a.id, date, time)
                          }
                          disabled={loading}
                        />

                        <button
                          onClick={() => cancelRemote(a.id)}
                          disabled={terminal || loading}
                          className={`h-11 rounded-2xl px-4 text-sm font-semibold transition ${
                            terminal || loading
                              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                              : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {filtered.length > 8 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="rounded-[22px] border border-slate-200 bg-slate-100 px-8 py-4 text-base font-semibold text-slate-600 shadow-sm transition hover:bg-slate-200"
              >
                {showAll ? "Show less" : `Show more (${filtered.length - 8})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
