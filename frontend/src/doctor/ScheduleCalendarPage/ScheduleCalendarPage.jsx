import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  Phone,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";

const API_BASE = "http://localhost:4000";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateTime(date, time) {
  return new Date(`${date || "1970-01-01"}T${time || "00:00"}:00`);
}

function formatFullDate(dateStr) {
  if (!dateStr) return "No date selected";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonthYear(date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatTimeAMPM(time24) {
  if (!time24) return "-";
  const [hh, mm = "00"] = String(time24).split(":");
  let h = parseInt(hh, 10);
  if (!Number.isFinite(h)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mm} ${ampm}`;
}

function to24Hour(timeStr) {
  if (!timeStr) return "00:00";
  const m = String(timeStr).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return timeStr;

  let hh = Number(m[1]);
  const mm = m[2];
  const ampm = m[3];

  if (!ampm) return `${String(hh).padStart(2, "0")}:${mm}`;
  if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
  if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;

  return `${String(hh).padStart(2, "0")}:${mm}`;
}

function backendToFrontendStatus(status) {
  const value = String(status || "Pending").toLowerCase();
  if (value === "completed" || value === "complete") return "complete";
  if (value === "canceled" || value === "cancelled") return "cancelled";
  if (value === "confirmed") return "confirmed";
  if (value === "rescheduled") return "rescheduled";
  return "pending";
}

function getAppointmentType(a) {
  return (
    a.type ||
    a.appointmentType ||
    a.reason ||
    a.speciality ||
    a.specialization ||
    (a.doctorId && (a.doctorId.specialization || a.doctorId.speciality)) ||
    "Doctor consultation"
  );
}

function normalizeAppointment(a) {
  if (!a) return null;

  const rawTime =
    a.time ||
    (a.slot && a.slot.time) ||
    (a.hour != null
      ? `${String(a.hour).padStart(2, "0")}:${String(a.minute || 0).padStart(
          2,
          "0",
        )}`
      : "");

  const payment = a.payment || {};
  const fee = Number(a.fees ?? a.fee ?? payment.amount ?? 0) || 0;

  return {
    id: a._id || a.id || `${a.date || "date"}-${rawTime}-${a.patientName}`,
    patient: a.patientName || a.patient || a.name || "Unknown Patient",
    mobile: a.mobile || a.phone || "",
    age: a.age ?? a.patientAge ?? "",
    gender: a.gender || "",
    date: a.date || (a.slot && a.slot.date) || "",
    time: to24Hour(rawTime),
    status: backendToFrontendStatus(a.status),
    fee,
    paymentMethod: payment.method || a.paymentMethod || "Cash",
    paymentStatus: payment.status || "Pending",
    type: getAppointmentType(a),
    details: a.notes || a.details || a.description || "",
  };
}

function statusLabel(status) {
  if (status === "complete") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "confirmed") return "Confirmed";
  if (status === "rescheduled") return "Rescheduled";
  return "Pending";
}

function statusClasses(status) {
  if (status === "complete")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "confirmed")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "rescheduled")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function statusDotClass(status) {
  if (status === "complete") return "bg-emerald-500";
  if (status === "confirmed") return "bg-blue-500";
  if (status === "cancelled") return "bg-rose-500";
  if (status === "rescheduled") return "bg-amber-500";
  return "bg-slate-400";
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      iso: toISODate(date),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function SummaryCard({ title, value, icon, tint }) {
  return (
    <div className="rounded-2xl border border-[#e5eaf5] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
            {title}
          </p>
          <p className="mt-2 text-[1.35rem] font-bold leading-none text-[#0f172a]">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(
        status,
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function AppointmentDetailCard({ appointment, compact = false }) {
  return (
    <article className="rounded-[22px] border border-[#e5eaf5] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef4fb] text-sm font-bold text-[#2563eb]">
          {getInitials(appointment.patient)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-bold text-[#0f172a]">
              {appointment.patient}
            </h4>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-xs text-[#64748b]">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-[#2563eb]" />
              {formatTimeAMPM(appointment.time)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#2563eb]" />
              {appointment.mobile || "No phone"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8fafc] px-3 py-2">
              <p className="font-semibold uppercase tracking-[0.12em] text-[#8a98b5]">
                Type
              </p>
              <p className="mt-1 font-semibold text-[#0f172a]">
                {appointment.type}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] px-3 py-2">
              <p className="font-semibold uppercase tracking-[0.12em] text-[#8a98b5]">
                Payment
              </p>
              <p className="mt-1 font-semibold text-[#0f172a]">
                ${appointment.fee} / {appointment.paymentStatus}
              </p>
            </div>
          </div>

          {!compact && (appointment.age || appointment.gender) && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#64748b]">
              <UserRound className="h-3.5 w-3.5 text-[#2563eb]" />
              {appointment.age ? `${appointment.age} yrs` : "Age N/A"}
              {appointment.gender ? `, ${appointment.gender}` : ""}
            </p>
          )}

          {!compact && appointment.details && (
            <p className="mt-3 rounded-2xl border border-[#e5eaf5] bg-[#fbfdff] px-3 py-2 text-xs leading-5 text-[#64748b]">
              {appointment.details}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function CalendarDayCell({
  day,
  appointments,
  isToday,
  isSelected,
  onSelectDay,
  onSelectAppointment,
}) {
  const visibleAppointments = appointments.slice(0, 3);
  const hiddenCount = Math.max(0, appointments.length - visibleAppointments.length);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectDay(day.iso)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectDay(day.iso);
        }
      }}
      className={[
        "min-h-[128px] rounded-[18px] border p-2.5 text-left transition",
        "focus:outline-none focus:ring-2 focus:ring-[#9bbcf6]",
        day.isCurrentMonth
          ? "border-[#e5eaf5] bg-white hover:border-[#b9cdf8] hover:shadow-sm"
          : "border-[#edf1f7] bg-[#f8fafc] text-[#a0aec0]",
        isSelected ? "border-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.15)]" : "",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
            isToday ? "bg-[#2563eb] text-white" : "text-[#0f172a]",
            !day.isCurrentMonth && !isToday ? "text-[#a0aec0]" : "",
          ].join(" ")}
        >
          {day.date.getDate()}
        </span>
        {appointments.length > 0 && (
          <span className="rounded-full bg-[#eef4fb] px-2 py-0.5 text-[11px] font-bold text-[#2563eb]">
            {appointments.length}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {visibleAppointments.map((appointment) => (
          <div
            key={appointment.id}
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onSelectAppointment(day.iso, appointment.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onSelectAppointment(day.iso, appointment.id);
              }
            }}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-[#e8eef8] bg-[#f8fbff] px-2 py-1.5 text-xs text-[#0f172a] hover:border-[#b9cdf8]"
            title={`${formatTimeAMPM(appointment.time)} - ${appointment.patient}`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(
                appointment.status,
              )}`}
            />
            <span className="shrink-0 font-semibold text-[#2563eb]">
              {formatTimeAMPM(appointment.time)}
            </span>
            <span className="truncate">{appointment.patient}</span>
          </div>
        ))}

        {hiddenCount > 0 && (
          <div className="rounded-xl bg-[#eef4fb] px-2 py-1 text-xs font-semibold text-[#2563eb]">
            +{hiddenCount} more
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScheduleCalendarPage() {
  const { id: doctorId } = useParams();
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  useEffect(() => {
    let cancelled = false;

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

        if (!cancelled) setAppointments(normalized);
      } catch (err) {
        console.error("fetchScheduleAppointments:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load schedule");
          setAppointments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (doctorId) fetchAppointments();

    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...appointments]
      .filter((appointment) =>
        statusFilter ? appointment.status === statusFilter : true,
      )
      .filter((appointment) => {
        if (!q) return true;
        return (
          appointment.patient.toLowerCase().includes(q) ||
          appointment.type.toLowerCase().includes(q) ||
          appointment.mobile.toLowerCase().includes(q) ||
          appointment.paymentStatus.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) => parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time),
      );
  }, [appointments, search, statusFilter]);

  const appointmentsByDate = useMemo(() => {
    return filtered.reduce((groups, appointment) => {
      const key = appointment.date || "Unscheduled";
      if (!groups[key]) groups[key] = [];
      groups[key].push(appointment);
      return groups;
    }, {});
  }, [filtered]);

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );

  const selectedAppointments = appointmentsByDate[selectedDate] || [];
  const selectedAppointment =
    selectedAppointments.find((item) => item.id === selectedAppointmentId) ||
    selectedAppointments[0] ||
    null;

  const todaysAppointments = appointments.filter((a) => a.date === todayISO);
  const upcomingAppointments = appointments.filter(
    (a) => a.date && a.date >= todayISO && a.status !== "cancelled",
  );
  const paidAppointments = appointments.filter(
    (a) => String(a.paymentStatus).toLowerCase() === "paid",
  );
  const hasFilteredAppointments = filtered.length > 0;

  function changeMonth(offset) {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset, 1);
      return next;
    });
    setSelectedAppointmentId(null);
  }

  function goToToday() {
    const today = new Date();
    setVisibleMonth(today);
    setSelectedDate(todayISO);
    setSelectedAppointmentId(null);
  }

  function selectDay(date) {
    setSelectedDate(date);
    setSelectedAppointmentId(null);
  }

  function selectAppointment(date, appointmentId) {
    setSelectedDate(date);
    setSelectedAppointmentId(appointmentId);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="border-b border-[#e9eef7] bg-white px-5 py-5 lg:px-8">
        <div className="mx-auto max-w-[1480px]">
          <h1 className="text-[1.9rem] font-bold tracking-tight text-[#0f172a]">
            Schedule Calendar
          </h1>
          <p className="mt-1 text-[0.98rem] text-[#64748b]">
            View your appointments in a monthly calendar layout
          </p>
        </div>
      </div>

      <div className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-[1480px]">
          <section className="rounded-[28px] border border-[#dbe7fb] bg-[#eef4fb] p-4 shadow-sm lg:p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-[1.5rem] font-bold text-[#0f172a]">
                    Doctor Schedule Overview
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Read-only calendar for bookings assigned to your doctor
                    profile.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[640px]">
                <SummaryCard
                  title="All"
                  value={appointments.length}
                  icon={<Stethoscope className="h-5 w-5" />}
                  tint="bg-[#e8eefc] text-[#3467d6]"
                />
                <SummaryCard
                  title="Today"
                  value={todaysAppointments.length}
                  icon={<Clock3 className="h-5 w-5" />}
                  tint="bg-[#e7f7fb] text-[#0891b2]"
                />
                <SummaryCard
                  title="Upcoming"
                  value={upcomingAppointments.length}
                  icon={<CalendarDays className="h-5 w-5" />}
                  tint="bg-[#e8f7ef] text-[#0f9f6e]"
                />
                <SummaryCard
                  title="Paid"
                  value={paidAppointments.length}
                  icon={<DollarSign className="h-5 w-5" />}
                  tint="bg-[#fff7e6] text-[#c47f10]"
                />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[30px] border border-[#e5eaf5] bg-white shadow-sm">
            <div className="border-b border-[#eef2f7] px-4 py-4 lg:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeMonth(-1)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e5eaf5] bg-[#f8fafc] text-[#334155] transition hover:bg-white"
                      title="Previous month"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeMonth(1)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e5eaf5] bg-[#f8fafc] text-[#334155] transition hover:bg-white"
                      title="Next month"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div>
                    <h2 className="text-[1.65rem] font-bold tracking-tight text-[#0f172a]">
                      {formatMonthYear(visibleMonth)}
                    </h2>
                    <p className="text-sm text-[#64748b]">
                      {filtered.length} appointment
                      {filtered.length === 1 ? "" : "s"} visible
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={goToToday}
                    className="h-10 rounded-2xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8]"
                  >
                    Today
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search patient, phone, type"
                      className="h-11 w-full rounded-2xl border border-[#e5eaf5] bg-[#f8fafc] py-3 pl-11 pr-10 text-sm text-[#0f172a] outline-none sm:w-[300px]"
                    />
                    {search && (
                      <button
                        type="button"
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
                  >
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="complete">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="border-b border-[#eef2f7] px-6 py-4 text-sm text-rose-600">
                {error}
              </div>
            )}

            {loading ? (
              <div className="px-6 py-16 text-center text-[#64748b]">
                Loading schedule calendar...
              </div>
            ) : !hasFilteredAppointments ? (
              <div className="px-6 py-16">
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eef4fb] text-[#2563eb]">
                    <CalendarDays className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-[#0f172a]">
                    No appointments on your calendar
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">
                    New patient bookings will appear here automatically. Try
                    clearing search or status filters if you expected results.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="p-4 lg:p-6">
                  <div className="hidden grid-cols-7 gap-2 pb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a98b5] md:grid">
                    {WEEKDAYS.map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  <div className="hidden grid-cols-7 gap-2 md:grid">
                    {calendarDays.map((day) => (
                      <CalendarDayCell
                        key={day.iso}
                        day={day}
                        appointments={appointmentsByDate[day.iso] || []}
                        isToday={day.iso === todayISO}
                        isSelected={day.iso === selectedDate}
                        onSelectDay={selectDay}
                        onSelectAppointment={selectAppointment}
                      />
                    ))}
                  </div>

                  <div className="space-y-3 md:hidden">
                    {calendarDays
                      .filter((day) => day.isCurrentMonth)
                      .map((day) => {
                        const dayAppointments = appointmentsByDate[day.iso] || [];
                        if (!dayAppointments.length) {
                          return (
                            <button
                              key={day.iso}
                              type="button"
                              onClick={() => selectDay(day.iso)}
                              className={[
                                "flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left",
                                day.iso === selectedDate
                                  ? "border-[#2563eb] bg-[#eef4fb]"
                                  : "border-[#e5eaf5] bg-white",
                              ].join(" ")}
                            >
                              <span className="font-semibold text-[#0f172a]">
                                {formatFullDate(day.iso)}
                              </span>
                              <span className="text-sm text-[#94a3b8]">
                                No visits
                              </span>
                            </button>
                          );
                        }

                        return (
                          <section
                            key={day.iso}
                            className={[
                              "rounded-[24px] border p-3",
                              day.iso === selectedDate
                                ? "border-[#2563eb] bg-[#eef4fb]"
                                : "border-[#e5eaf5] bg-white",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              onClick={() => selectDay(day.iso)}
                              className="mb-3 flex w-full items-center justify-between text-left"
                            >
                              <span className="font-bold text-[#0f172a]">
                                {formatFullDate(day.iso)}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2563eb]">
                                {dayAppointments.length}
                              </span>
                            </button>

                            <div className="space-y-2">
                              {dayAppointments.map((appointment) => (
                                <button
                                  key={appointment.id}
                                  type="button"
                                  onClick={() =>
                                    selectAppointment(day.iso, appointment.id)
                                  }
                                  className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-[#e8eef8] bg-white px-3 py-2 text-left text-sm"
                                >
                                  <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(
                                      appointment.status,
                                    )}`}
                                  />
                                  <span className="shrink-0 font-semibold text-[#2563eb]">
                                    {formatTimeAMPM(appointment.time)}
                                  </span>
                                  <span className="truncate text-[#0f172a]">
                                    {appointment.patient}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </section>
                        );
                      })}
                  </div>
                </div>

                <aside className="border-t border-[#eef2f7] bg-[#fbfdff] p-4 xl:border-l xl:border-t-0 xl:p-5">
                  <div className="sticky top-4">
                    <div className="mb-4 rounded-[24px] border border-[#e5eaf5] bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a98b5]">
                        Selected Day
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-[#0f172a]">
                        {formatFullDate(selectedDate)}
                      </h3>
                      <p className="mt-1 text-sm text-[#64748b]">
                        {selectedAppointments.length} appointment
                        {selectedAppointments.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    {selectedAppointments.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#d7e2f3] bg-white p-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
                          <CalendarDays className="h-6 w-6" />
                        </div>
                        <h4 className="mt-4 font-bold text-[#0f172a]">
                          No appointments this day
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-[#64748b]">
                          Select another date with a badge to view patient
                          details.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedAppointment && (
                          <AppointmentDetailCard
                            appointment={selectedAppointment}
                          />
                        )}

                        {selectedAppointments.length > 1 && (
                          <div className="rounded-[24px] border border-[#e5eaf5] bg-white p-3">
                            <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a98b5]">
                              Other visits
                            </p>
                            <div className="space-y-2">
                              {selectedAppointments.map((appointment) => (
                                <button
                                  key={appointment.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedAppointmentId(appointment.id)
                                  }
                                  className={[
                                    "flex w-full min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition",
                                    appointment.id === selectedAppointment?.id
                                      ? "bg-[#eef4fb] text-[#0f172a]"
                                      : "bg-[#f8fafc] text-[#334155] hover:bg-[#eef4fb]",
                                  ].join(" ")}
                                >
                                  <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(
                                      appointment.status,
                                    )}`}
                                  />
                                  <span className="shrink-0 font-semibold text-[#2563eb]">
                                    {formatTimeAMPM(appointment.time)}
                                  </span>
                                  <span className="truncate">
                                    {appointment.patient}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-[#e5eaf5] bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
                              Paid
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#2563eb]">
                              {
                                selectedAppointments.filter(
                                  (item) =>
                                    String(item.paymentStatus).toLowerCase() ===
                                    "paid",
                                ).length
                              }
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#e5eaf5] bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
                              Revenue
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#2563eb]">
                              $
                              {selectedAppointments.reduce(
                                (sum, item) => sum + item.fee,
                                0,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
