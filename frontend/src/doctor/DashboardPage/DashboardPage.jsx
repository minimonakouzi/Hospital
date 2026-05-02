import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign,
  Activity,
  Search,
  Phone,
  Clock3,
} from "lucide-react";

const API_BASE = "http://localhost:4000";
const ITEMS_PER_PAGE = 3;

/* -------------------------
   Helpers
------------------------- */
function parseDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function formatTimeAMPM(time24) {
  if (!time24) return "";
  const [hh, mm] = time24.split(":");
  let h = parseInt(hh, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mm} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function backendToFrontendStatus(s) {
  if (!s) return "pending";
  const v = String(s).toLowerCase();
  if (v === "pending") return "pending";
  if (v === "confirmed") return "confirmed";
  if (v === "completed") return "complete";
  if (v === "canceled" || v === "cancelled") return "cancelled";
  if (v === "rescheduled") return "rescheduled";
  return v;
}

function frontendToBackendStatus(fs) {
  if (!fs) return "Pending";
  const v = String(fs).toLowerCase();
  if (v === "pending") return "Pending";
  if (v === "confirmed") return "Confirmed";
  if (v === "complete") return "Completed";
  if (v === "cancelled") return "Canceled";
  if (v === "rescheduled") return "Rescheduled";
  return fs;
}

function to24Hour(timeStr) {
  if (!timeStr) return "00:00";
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return timeStr;
  let hh = Number(m[1]);
  const mm = m[2];
  const ampm = m[3];

  if (!ampm) return `${String(hh).padStart(2, "0")}:${mm}`;

  const up = ampm.toUpperCase();
  if (up === "AM") {
    if (hh === 12) hh = 0;
  } else {
    if (hh !== 12) hh += 12;
  }
  return `${String(hh).padStart(2, "0")}:${mm}`;
}

function to12HourFrom24(hhmm) {
  if (!hhmm) return "12:00 AM";
  const [hh, mm] = hhmm.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12)}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function normalizeAppointment(a) {
  if (!a) return null;

  const id = a._id || a.id || String(Math.random()).slice(2);
  const patient = a.patientName || a.patient || a.name || "Unknown";
  const age = a.age ?? a.patientAge ?? "";
  const gender = a.gender || "";

  const doctorName =
    (a.doctorId && typeof a.doctorId === "object" && a.doctorId.name) ||
    a.doctorName ||
    a.doctor ||
    "Doctor";

  const doctorImage =
    (a.doctorId && typeof a.doctorId === "object" && a.doctorId.imageUrl) ||
    a.doctorImage ||
    a.doctorImageUrl ||
    "";

  const speciality =
    (a.doctorId && (a.doctorId.specialization || a.doctorId.speciality)) ||
    a.speciality ||
    a.specialization ||
    "";

  const mobile = a.mobile || a.phone || "";
  const fee = Number(a.fees ?? a.fee ?? a.payment?.amount ?? 0) || 0;
  const date = a.date || (a.slot && a.slot.date) || "";

  const rawTime =
    a.time ||
    (a.slot && a.slot.time) ||
    (a.hour != null && a.minute != null
      ? `${String(a.hour).padStart(2, "0")}:${String(a.minute).padStart(
          2,
          "0",
        )}`
      : "");

  const time24 = to24Hour(rawTime);
  const status = backendToFrontendStatus(
    a.status || (a.payment && a.payment.status) || "Pending",
  );

  return {
    id,
    patient,
    age,
    gender,
    doctorName,
    doctorImage,
    speciality,
    mobile,
    date,
    time: time24,
    fee,
    status,
    raw: a,
  };
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/* -------------------------
   UI bits
------------------------- */
function MetricCard({ title, value, icon, tint = "bg-blue-50 text-blue-600" }) {
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
            {title}
          </p>
          <p className="mt-2 text-[1.4rem] font-bold leading-none text-[#0f172a]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "complete") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
        Completed
      </span>
    );
  }

  if (status === "confirmed") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
        Confirmed
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
        Cancelled
      </span>
    );
  }

  if (status === "rescheduled") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
        Rescheduled
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      Pending
    </span>
  );
}

function StatusSelect({ appointment, onChange }) {
  const terminal =
    appointment.status === "complete" || appointment.status === "cancelled";

  if (appointment.status === "rescheduled") {
    return (
      <select
        value={appointment.status}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-3 text-xs font-semibold text-[#64748b] outline-none transition focus:border-blue-300 focus:bg-white"
      >
        <option value="rescheduled" disabled>
          Rescheduled
        </option>
        <option value="complete">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    );
  }

  return (
    <select
      value={appointment.status}
      onChange={(e) => onChange(e.target.value)}
      disabled={terminal}
      className={`h-11 w-full rounded-2xl border px-3 text-xs font-semibold outline-none transition ${
        terminal
          ? "cursor-not-allowed border-[#eef2f7] bg-[#f8fafc] text-[#a0aec0]"
          : "border-[#dbe6f7] bg-[#f8fbff] text-[#64748b] focus:border-blue-300 focus:bg-white"
      }`}
    >
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="complete">Completed</option>
      <option value="cancelled">Cancelled</option>
    </select>
  );
}

function RescheduleButton({ appointment, onReschedule }) {
  const terminal =
    appointment.status === "complete" || appointment.status === "cancelled";

  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(appointment.date || "");
  const [time, setTime] = useState(appointment.time || "09:00");

  const minDate = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  useEffect(() => {
    const apptRaw = appointment.date ? String(appointment.date) : "";
    const apptDate = apptRaw.slice(0, 10);
    setDate(apptDate && apptDate >= minDate ? apptDate : minDate);
    setTime(appointment.time || "09:00");
  }, [appointment.date, appointment.time, minDate]);

  function save() {
    if (!date || !time) return;
    if (date < minDate) {
      setDate(minDate);
      return;
    }
    onReschedule(date, time);
    setEditing(false);
  }

  function cancel() {
    const apptRaw = appointment.date ? String(appointment.date) : "";
    const apptDate = apptRaw.slice(0, 10);
    setDate(apptDate && apptDate >= minDate ? apptDate : minDate);
    setTime(appointment.time || "09:00");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        disabled={terminal}
        className={`h-10 w-full rounded-full px-4 text-xs font-medium ${
          terminal
            ? "cursor-not-allowed border border-[#eef2f7] bg-[#f8fafc] text-[#a0aec0]"
            : "border border-[#dbe6f7] bg-white text-[#64748b] transition hover:bg-[#f8fbff]"
        }`}
      >
        Reschedule
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="date"
        value={date}
        min={minDate}
        onChange={(e) => setDate(e.target.value)}
        className="h-10 rounded-2xl border border-[#dbe6f7] px-3 text-xs text-[#64748b] outline-none"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="h-10 rounded-2xl border border-[#dbe6f7] px-3 text-xs text-[#64748b] outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          className="h-10 flex-1 rounded-2xl bg-[#2563eb] px-4 text-xs font-semibold text-white"
        >
          Save
        </button>
        <button
          onClick={cancel}
          className="h-10 flex-1 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-xs font-semibold text-[#64748b]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DesktopRow({ a, onStatusChange, onReschedule }) {
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.9fr_1.15fr] items-center gap-4 border-t border-[#eef2f7] px-6 py-4 transition duration-200 hover:bg-[#f8fbff]">
      <div className="flex min-w-0 items-center gap-3">
        {a.doctorImage ? (
          <img
            src={a.doctorImage}
            alt={a.patient}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
            {getInitials(a.patient)}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0f172a]">
            {a.patient}
          </p>
          <p className="truncate text-[11px] text-[#94a3b8]">
            {a.age ? `${a.age} yrs` : "yrs"} {a.gender ? `· ${a.gender}` : ""}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#64748b]">
            {a.speciality || "-"}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#3b82f6]">
            <Phone className="h-3 w-3" />
            <span className="truncate">{a.mobile || "-"}</span>
          </div>
        </div>
      </div>

      <div className="text-sm text-[#0f172a]">{formatDate(a.date)}</div>

      <div className="text-sm text-[#0f172a]">
        <div className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-[#64748b]" />
          {formatTimeAMPM(a.time)}
        </div>
      </div>

      <div>
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">
          ${a.fee}
        </span>
      </div>

      <div>
        <StatusBadge status={a.status} />
      </div>

      <div className="flex flex-col gap-2">
        <StatusSelect appointment={a} onChange={onStatusChange} />
        <RescheduleButton appointment={a} onReschedule={onReschedule} />
      </div>
    </div>
  );
}

/* -------------------------
   Main
------------------------- */
export default function DashboardPage({ apiBase }) {
  const { id: doctorId } = useParams();
  const API = apiBase || API_BASE;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  async function fetchAppointments() {
    setLoading(true);
    setError(null);

    try {
      const url = `${API}/api/appointments/doctor/${encodeURIComponent(doctorId)}`;
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || `Failed to fetch appointments (${res.status})`,
        );
      }

      const body = await res.json();

      const list = Array.isArray(body.appointments)
        ? body.appointments
        : Array.isArray(body)
          ? body
          : (body.items ?? body.data ?? []);

      const normalized = (Array.isArray(list) ? list : [])
        .map(normalizeAppointment)
        .filter(Boolean);

      setAppointments(normalized);
    } catch (err) {
      console.error("fetchAppointments:", err);
      setError(err.message || "Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, [API, doctorId]);

  const sorted = useMemo(() => {
    return [...appointments].sort(
      (a, b) => parseDateTime(b.date, b.time) - parseDateTime(a.date, a.time),
    );
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;

    return sorted.filter(
      (a) =>
        (a.patient || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q) ||
        String(a.fee || "").includes(q),
    );
  }, [sorted, search]);

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(
    (a) => a.status === "complete",
  ).length;
  const cancelledAppointments = appointments.filter(
    (a) => a.status === "cancelled",
  ).length;
  const totalEarnings = appointments
    .filter((a) => a.status === "complete")
    .reduce((s, a) => s + (Number(a.fee) || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedAppointments = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const startLabel =
    filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endLabel = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  async function updateStatusRemote(id, newStatusFrontend) {
    const appt = appointments.find((p) => p.id === id);
    if (!appt) return;
    if (appt.status === "complete" || appt.status === "cancelled") return;

    const backendStatus = frontendToBackendStatus(newStatusFrontend);

    setAppointments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatusFrontend } : p)),
    );

    try {
      const res = await fetch(`${API}/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || `Status update failed (${res.status})`,
        );
      }

      const data = await res.json();
      const updated = data.appointment || data;

      setAppointments((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const mergedRaw = { ...(p.raw || {}), ...(updated || {}) };
          const normalized = normalizeAppointment(mergedRaw);
          if (normalized) return normalized;

          return {
            ...p,
            status: backendToFrontendStatus(updated.status || backendStatus),
            raw: mergedRaw,
          };
        }),
      );
    } catch (err) {
      console.error("updateStatusRemote:", err);
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: appt.status } : p)),
      );
      setError(err.message || "Failed to update status");
    }
  }

  async function rescheduleRemote(id, newDate, newTime24) {
    const appt = appointments.find((p) => p.id === id);
    if (!appt) return;
    if (appt.status === "complete" || appt.status === "cancelled") return;

    const time12 = to12HourFrom24(newTime24);

    setAppointments((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, date: newDate, time: newTime24, status: "rescheduled" }
          : p,
      ),
    );

    try {
      const res = await fetch(`${API}/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, time: time12 }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Reschedule failed (${res.status})`);
      }

      const data = await res.json();
      const updated = data.appointment || data;

      setAppointments((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const mergedRaw = { ...(p.raw || {}), ...(updated || {}) };
          const normalized = normalizeAppointment(mergedRaw);
          if (normalized) return normalized;

          return {
            ...p,
            date: newDate,
            time: newTime24,
            status: backendToFrontendStatus(updated.status || "Rescheduled"),
            raw: mergedRaw,
          };
        }),
      );
    } catch (err) {
      console.error("rescheduleRemote:", err);
      setError(err.message || "Failed to reschedule");
      await fetchAppointments();
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="border-b border-[#dbe6f7] bg-white/95 px-4 py-5 shadow-[0_1px_0_rgba(15,23,42,0.02)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
            Doctor / Dashboard
          </p>
          <div className="mb-2 h-1 w-10 rounded-full bg-[#2563eb]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] sm:text-[1.7rem]">
            Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#64748b]">
            Overview of your appointments and earnings
          </p>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Metrics */}
          <div className="rounded-3xl border border-[#dbe6f7] bg-[#eef4fb] px-5 py-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Activity className="h-4 w-4 text-[#2563eb]" />
              </div>
              <div>
                <h2 className="text-[1.55rem] font-bold text-[#0f172a]">
                  Key Metrics
                </h2>
                <p className="text-[0.92rem] text-[#64748b]">
                  Live overview of doctor dashboard statistics
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total Appointments"
                value={totalAppointments}
                icon={<Calendar className="h-5 w-5" />}
                tint="bg-[#e8eefc] text-[#3467d6]"
              />
              <MetricCard
                title="Total Earnings"
                value={`$${totalEarnings}`}
                icon={<DollarSign className="h-5 w-5" />}
                tint="bg-[#e8f7ef] text-[#0f9f6e]"
              />
              <MetricCard
                title="Completed"
                value={completedAppointments}
                icon={<CheckCircle className="h-5 w-5" />}
                tint="bg-[#e7f7fb] text-[#0891b2]"
              />
              <MetricCard
                title="Canceled"
                value={cancelledAppointments}
                icon={<XCircle className="h-5 w-5" />}
                tint="bg-[#fdecef] text-[#e11d48]"
              />
            </div>
          </div>

          {/* Latest Appointments */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
            <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div>
                <h2 className="text-[1.7rem] font-bold tracking-tight text-[#0f172a]">
                  Latest Appointments
                </h2>
                <p className="mt-1 text-[0.95rem] text-[#64748b]">
                  Manage and view appointment statistics
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search patient / specialization / fee"
                    className="h-12 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] py-3 pl-11 pr-10 text-sm text-[#0f172a] outline-none transition focus:border-blue-300 focus:bg-white sm:w-[280px] lg:w-[300px]"
                  />
                </div>

                <button
                  onClick={() => setSearch("")}
                  className="h-12 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fbff]"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="sticky top-0 hidden grid-cols-[2fr_1fr_1fr_0.8fr_0.9fr_1.15fr] gap-4 bg-[#f8fbff] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8aa5] lg:grid">
              <div>Patient</div>
              <div>Date</div>
              <div>Time</div>
              <div>Fee</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {error && (
              <div className="border-t border-[#eef2f7] px-6 py-4 text-sm text-rose-600">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid gap-3 border-t border-[#eef2f7] px-6 py-6">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : paginatedAppointments.length === 0 ? (
              <div className="border-t border-[#eef2f7] px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
                  <Calendar className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#0f172a]">
                  No appointments found.
                </p>
                <p className="mt-1 text-xs text-[#64748b]">
                  Matching appointments will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  {paginatedAppointments.map((a) => (
                    <DesktopRow
                      key={a.id}
                      a={a}
                      onStatusChange={(status) =>
                        updateStatusRemote(a.id, status)
                      }
                      onReschedule={(date, time) =>
                        rescheduleRemote(a.id, date, time)
                      }
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
                  {paginatedAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-3xl border border-[#dbe6f7] bg-[#fbfdff] p-4 transition duration-200 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {a.doctorImage ? (
                          <img
                            src={a.doctorImage}
                            alt={a.patient}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {getInitials(a.patient)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[#0f172a]">
                            {a.patient}
                          </p>
                          <p className="text-xs text-[#94a3b8]">
                            {a.age ? `${a.age} yrs` : "yrs"}{" "}
                            {a.gender ? `· ${a.gender}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-[#64748b]">
                            {a.speciality || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[#94a3b8]">Date</p>
                          <p className="font-medium text-[#0f172a]">
                            {formatDate(a.date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#94a3b8]">Time</p>
                          <p className="font-medium text-[#0f172a]">
                            {formatTimeAMPM(a.time)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#94a3b8]">Fee</p>
                          <p className="font-semibold text-[#2563eb]">
                            ${a.fee}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#94a3b8]">Phone</p>
                          <p className="font-medium text-[#3b82f6]">
                            {a.mobile || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <StatusBadge status={a.status} />
                      </div>

                      <div className="mt-3 flex flex-col gap-2">
                        <StatusSelect
                          appointment={a}
                          onChange={(status) =>
                            updateStatusRemote(a.id, status)
                          }
                        />
                        <RescheduleButton
                          appointment={a}
                          onReschedule={(date, time) =>
                            rescheduleRemote(a.id, date, time)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t border-[#eef2f7] px-5 py-4 text-sm text-[#7c8aa5] sm:flex-row sm:items-center sm:justify-between lg:px-6">
              <div>
                Showing {startLabel} to {endLabel} of {filtered.length}{" "}
                appointments
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    page === 1
                      ? "cursor-not-allowed border border-[#eef2f7] bg-[#f8fafc] text-[#c0c8d8]"
                      : "border border-[#e5eaf5] bg-white text-[#64748b] hover:bg-[#f8fafc]"
                  }`}
                >
                  Previous
                </button>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || filtered.length === 0}
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    page === totalPages || filtered.length === 0
                      ? "cursor-not-allowed border border-[#eef2f7] bg-[#f8fafc] text-[#c0c8d8]"
                      : "border border-[#e5eaf5] bg-white text-[#64748b] hover:bg-[#f8fafc]"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
