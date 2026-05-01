import React, { useEffect, useMemo, useState } from "react";
import { Search, X, Phone, Clock3 } from "lucide-react";
import { useParams } from "react-router-dom";

const API_BASE = "http://localhost:4000";
const ITEMS_PER_PAGE = 4;

/* -------------------------
   Utils
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

function to24HourFromMaybe12(timeStr) {
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

function backendToFrontendStatus(s) {
  if (!s) return "pending";
  const v = String(s).toLowerCase();
  if (v === "pending") return "pending";
  if (v === "confirmed") return "confirmed";
  if (v === "completed" || v === "complete") return "complete";
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

function normalizeAppointment(a) {
  if (!a) return null;

  const id = a._id || a.id || String(Math.random()).slice(2);
  const patient = a.patientName || a.patient || a.name || "Unknown";
  const age = a.age ?? a.patientAge ?? "";
  const gender = a.gender || "";

  const doctorName =
    (a.doctorId && a.doctorId.name) || a.doctorName || a.doctor || "";

  const doctorImage =
    (a.doctorId && (a.doctorId.imageUrl || a.doctorId.image)) ||
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
    (a.hour != null
      ? `${String(a.hour).padStart(2, "0")}:${String(a.minute || 0).padStart(
          2,
          "0",
        )}`
      : "");

  const time = to24HourFromMaybe12(rawTime);
  const status = backendToFrontendStatus(
    a.status || a.payment?.status || "pending",
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
    time,
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

/* ================= StatusBadge ================= */
function StatusBadge({ status }) {
  if (status === "complete") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
        Completed
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

  if (status === "confirmed") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
        Confirmed
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

/* ================= StatusSelect ================= */
function StatusSelect({ appointment, onChange }) {
  const terminal =
    appointment.status === "complete" || appointment.status === "cancelled";

  if (appointment.status === "rescheduled") {
    return (
      <select
        value={appointment.status}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-full border border-[#e5eaf5] bg-[#f8fafc] px-3 text-xs text-[#64748b] outline-none"
        title="After reschedule you can mark Completed or Cancelled"
      >
        <option value="rescheduled" disabled>
          Rescheduled
        </option>
        <option value="complete">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    );
  }

  const options = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "complete", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <select
      value={appointment.status}
      onChange={(e) => onChange(e.target.value)}
      disabled={terminal}
      className={`h-10 w-full rounded-full border px-3 text-xs outline-none ${
        terminal
          ? "cursor-not-allowed border-[#eef2f7] bg-[#f8fafc] text-[#a0aec0]"
          : "border-[#e5eaf5] bg-[#f8fafc] text-[#64748b]"
      }`}
      title={terminal ? "Status cannot be changed" : "Change status"}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ================= RescheduleButton ================= */
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
        title={
          terminal ? "Cannot reschedule completed/cancelled" : "Reschedule"
        }
        className={`h-10 w-full rounded-full px-4 text-xs font-medium ${
          terminal
            ? "cursor-not-allowed border border-[#eef2f7] bg-[#f8fafc] text-[#a0aec0]"
            : "border border-[#e5eaf5] bg-white text-[#64748b] hover:bg-[#f8fafc]"
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
        className="h-10 rounded-full border border-[#e5eaf5] px-3 text-xs text-[#64748b] outline-none"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="h-10 rounded-full border border-[#e5eaf5] px-3 text-xs text-[#64748b] outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          className="h-10 flex-1 rounded-full bg-[#2563eb] px-4 text-xs font-semibold text-white"
        >
          Save
        </button>
        <button
          onClick={cancel}
          className="h-10 flex-1 rounded-full border border-[#e5eaf5] bg-white px-4 text-xs font-semibold text-[#64748b]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ListPage() {
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const { id: doctorId } = useParams();

  async function fetchAppointments() {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/api/appointments/doctor/${encodeURIComponent(
        doctorId,
      )}`;

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
  }, [doctorId]);

  async function updateStatusRemote(id, newStatus) {
    const appt = appointments.find((p) => p.id === id);
    if (!appt) return;
    if (appt.status === "complete" || appt.status === "cancelled") return;

    const backendStatus = frontendToBackendStatus(newStatus);

    setAppointments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
    );

    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
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

      const body = await res.json();
      const updated = body.appointment || body;

      setAppointments((prev) =>
        prev.map((p) =>
          p.id === id
            ? normalizeAppointment(updated) || {
                ...p,
                status: backendToFrontendStatus(
                  updated.status || backendStatus,
                ),
              }
            : p,
        ),
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
      const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, time: time12 }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Reschedule failed (${res.status})`);
      }

      const body = await res.json();
      const updated = body.appointment || body;

      setAppointments((prev) =>
        prev.map((p) =>
          p.id === id
            ? normalizeAppointment(updated) || {
                ...p,
                date: newDate,
                time: newTime24,
                status: backendToFrontendStatus(
                  updated.status || "Rescheduled",
                ),
              }
            : p,
        ),
      );
    } catch (err) {
      console.error("rescheduleRemote:", err);
      setError(err.message || "Failed to reschedule — reloading");
      await fetchAppointments();
    }
  }

  const filtered = useMemo(() => {
    return [...appointments]
      .filter((a) =>
        search
          ? (a.patient || "").toLowerCase().includes(search.toLowerCase())
          : true,
      )
      .filter((a) => (statusFilter ? a.status === statusFilter : true))
      .sort(
        (a, b) => parseDateTime(b.date, b.time) - parseDateTime(a.date, a.time),
      );
  }, [appointments, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="border-b border-[#e9eef7] bg-white px-6 py-5 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <h1 className="text-[1.9rem] font-bold tracking-tight text-[#0f172a]">
            Appointments
          </h1>
          <p className="mt-1 text-[0.98rem] text-[#64748b]">
            Manage your doctor appointments
          </p>
        </div>
      </div>

      <div className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="overflow-hidden rounded-[30px] border border-[#e5eaf5] bg-white shadow-sm">
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
                    placeholder="Search patient name"
                    className="h-11 w-full rounded-2xl border border-[#e5eaf5] bg-[#f8fafc] py-3 pl-11 pr-10 text-sm text-[#0f172a] outline-none sm:w-[280px] lg:w-[300px]"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 rounded-2xl border border-[#e5eaf5] bg-[#f8fafc] px-4 text-sm text-[#334155] outline-none"
                  title="Filter by status"
                >
                  <option value="">All</option>
                  <option value="complete">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="hidden grid-cols-[2fr_1fr_1fr_0.8fr_0.9fr_1.15fr] gap-4 bg-[#f8fafc] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8aa5] lg:grid">
              <div>Patient</div>
              <div>Date</div>
              <div>Time</div>
              <div>Fee</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {loading ? (
              <div className="border-t border-[#eef2f7] px-6 py-10 text-center text-[#64748b]">
                Loading appointments...
              </div>
            ) : error ? (
              <div className="border-t border-[#eef2f7] px-6 py-10 text-center text-rose-600">
                Error: {error}
              </div>
            ) : paginatedAppointments.length === 0 ? (
              <div className="border-t border-[#eef2f7] px-6 py-10 text-center text-[#64748b]">
                No appointments found.
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  {paginatedAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.9fr_1.15fr] items-center gap-4 border-t border-[#eef2f7] px-6 py-3.5"
                    >
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
                            {a.age ? `${a.age} yrs` : "yrs"}{" "}
                            {a.gender ? `· ${a.gender}` : ""}
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

                      <div className="text-sm text-[#0f172a]">
                        {formatDate(a.date)}
                      </div>

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
                        <StatusSelect
                          appointment={a}
                          onChange={(s) => updateStatusRemote(a.id, s)}
                        />
                        <RescheduleButton
                          appointment={a}
                          onReschedule={(d, t) => rescheduleRemote(a.id, d, t)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
                  {paginatedAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-[22px] border border-[#e5eaf5] bg-[#fbfdff] p-4"
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
                          onChange={(s) => updateStatusRemote(a.id, s)}
                        />
                        <RescheduleButton
                          appointment={a}
                          onReschedule={(d, t) => rescheduleRemote(a.id, d, t)}
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
