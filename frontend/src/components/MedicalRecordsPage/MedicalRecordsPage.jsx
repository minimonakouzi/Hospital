import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileHeart,
  FlaskConical,
  HeartPulse,
  Phone,
  Search,
  ShieldPlus,
  Stethoscope,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API = axios.create({ baseURL: API_BASE });

const filters = [
  { value: "all", label: "All" },
  { value: "doctor", label: "Doctor Visits" },
  { value: "service", label: "Services" },
  { value: "completed", label: "Completed" },
  { value: "upcoming", label: "Upcoming" },
];

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value) {
  return String(value ?? 0).padStart(2, "0");
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function formatMonthYear(date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

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

function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return new Date(0);
  const parsed = new Date(`${dateStr} ${timeStr || "00:00"}`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const iso = new Date(dateStr);
  if (!Number.isNaN(iso.getTime())) return iso;
  return new Date(0);
}

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  const parsed = new Date(`${dateStr}T00:00:00`);
  const fallback = new Date(dateStr);
  const d = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(dateStr) {
  if (!dateStr) return "Unscheduled";
  const parsed = new Date(`${dateStr}T00:00:00`);
  const fallback = new Date(dateStr);
  const d = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizeStatus(item) {
  const raw = String(item?.status || "").toLowerCase();
  if (raw === "completed" || raw === "complete") return "Completed";
  if (raw === "confirmed") return "Confirmed";
  if (raw === "canceled" || raw === "cancelled") return "Canceled";
  if (raw === "rescheduled") return "Rescheduled";
  if (raw === "pending") return "Pending";

  const paymentPaid =
    String(item?.payment?.status || "").toLowerCase() === "paid";
  if (paymentPaid) return "Confirmed";
  return "Pending";
}

function isCompletedStatus(status) {
  return String(status || "").toLowerCase() === "completed";
}

function isUpcomingRecord(record) {
  if (!record.date) return false;
  if (["Canceled", "Completed"].includes(record.status)) return false;
  const visitDate = parseDateTime(record.date, record.time);
  return visitDate >= new Date();
}

function getTimeFromService(service) {
  if (service.time) return service.time;
  if (
    service.hour !== undefined &&
    service.minute !== undefined &&
    service.ampm
  ) {
    return `${service.hour}:${pad(service.minute)} ${service.ampm}`;
  }
  if (service.hour !== undefined && service.ampm) {
    return `${service.hour}:00 ${service.ampm}`;
  }
  return "";
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function EmptyState({ icon: Icon = FileHeart, title, text }) {
  return (
    <div className="rounded-[26px] border border-dashed border-[#cfe0fb] bg-white/80 px-6 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#eef4fb] text-[#2563eb]">
        {React.createElement(Icon, { className: "h-7 w-7" })}
      </div>
      <h3 className="mt-4 text-lg font-bold text-[#0f172a]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748b]">
        {text}
      </p>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, emptyText = "Not provided" }) {
  return (
    <div className="rounded-[24px] border border-[#dbe6f7] bg-white px-5 py-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
          {React.createElement(Icon, { className: "h-5 w-5" })}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8aa5]">
          {label}
        </p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-[#334155]">
        {value ? String(value) : emptyText}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "Pending");
  const lower = value.toLowerCase();

  const className =
    lower === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : lower === "confirmed"
        ? "bg-blue-50 text-blue-700"
        : lower === "canceled"
          ? "bg-rose-50 text-rose-700"
          : lower === "rescheduled"
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  );
}

function recordDotClass(record) {
  if (record.kind === "doctor") return "bg-[#2563eb]";
  return "bg-cyan-500";
}

function CalendarEventChip({ record, onClick }) {
  const Icon = record.kind === "doctor" ? Stethoscope : FlaskConical;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6 w-full min-w-0 items-center gap-1.5 rounded-lg border border-[#e8eef8] bg-[#f8fbff] px-1.5 text-left text-[10px] text-[#0f172a] transition hover:border-[#b9cdf8] hover:bg-white"
      title={`${record.title} - ${record.status}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${recordDotClass(record)}`}
      />
      <Icon className="h-3 w-3 shrink-0 text-[#2563eb]" />
      <span className="truncate font-semibold">{record.title}</span>
      <span className="ml-auto hidden shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#64748b] 2xl:inline-flex">
        {record.status}
      </span>
    </button>
  );
}

function CalendarDayCell({
  day,
  records,
  isToday,
  isSelected,
  onSelectDay,
  onSelectRecord,
}) {
  const visibleRecords = records.slice(0, 2);
  const moreCount = Math.max(0, records.length - visibleRecords.length);

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
        "min-h-[92px] rounded-xl border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[#9bbcf6] 2xl:min-h-[104px]",
        day.isCurrentMonth
          ? "border-[#e5eaf5] bg-white hover:border-[#b9cdf8] hover:shadow-sm"
          : "border-[#edf1f7] bg-[#f8fafc] text-[#a0aec0]",
        isSelected
          ? "border-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.14)]"
          : "",
      ].join(" ")}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
            isToday ? "bg-[#2563eb] text-white" : "text-[#0f172a]",
            !day.isCurrentMonth && !isToday ? "text-[#a0aec0]" : "",
          ].join(" ")}
        >
          {day.date.getDate()}
        </span>
        {records.length > 0 && (
          <span className="rounded-full bg-[#eef4fb] px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
            {records.length}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {visibleRecords.map((record) => (
          <CalendarEventChip
            key={record.id}
            record={record}
            onClick={(event) => {
              event.stopPropagation();
              onSelectRecord(day.iso, record.id);
            }}
          />
        ))}
        {moreCount > 0 && (
          <div className="rounded-lg bg-[#eef4fb] px-1.5 py-0.5 text-[10px] font-semibold text-[#2563eb]">
            +{moreCount} more
          </div>
        )}
      </div>
    </div>
  );
}

function RecordCard({ record }) {
  const Icon = record.kind === "doctor" ? Stethoscope : FlaskConical;

  return (
    <article className="rounded-[22px] border border-[#e5eaf5] bg-white p-4 shadow-sm transition hover:border-[#cfdcf4] hover:shadow-md">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-[#0f172a]">
                {record.title}
              </h3>
              <StatusBadge status={record.status} />
            </div>
            <p className="mt-1 text-xs text-[#2563eb]">{record.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-[#64748b]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[#2563eb]" />
                {formatDate(record.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-[#2563eb]" />
                {record.time || "Time not set"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <WalletCards className="h-3.5 w-3.5 text-[#2563eb]" />
                {record.paymentMethod} / {record.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#f8fafc] px-3 py-2 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
            Amount
          </p>
          <p className="mt-1 text-base font-bold text-[#2563eb]">
            ${record.amount}
          </p>
        </div>
      </div>
    </article>
  );
}

function DayDetailsPanel({ date, records, selectedRecordId, onSelectRecord }) {
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ||
    records[0] ||
    null;

  return (
    <aside className="border-t border-[#eef2f7] bg-[#fbfdff] p-4 xl:border-l xl:border-t-0">
      <div className="sticky top-5">
        <div className="mb-3 rounded-[20px] border border-[#e5eaf5] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8aa5]">
            Selected Day
          </p>
          <h3 className="mt-2 text-base font-bold text-[#0f172a]">
            {formatLongDate(date)}
          </h3>
          <p className="mt-1 text-xs text-[#64748b]">
            {records.length} medical event{records.length === 1 ? "" : "s"}
          </p>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No records this day"
            text="Select a day with a badge to view doctor visits and services."
          />
        ) : (
          <div className="space-y-4">
            {selectedRecord && <RecordCard record={selectedRecord} />}

            {records.length > 1 && (
              <div className="rounded-[24px] border border-[#e5eaf5] bg-white p-3 shadow-sm">
                <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8aa5]">
                  Other events
                </p>
                <div className="space-y-2">
                  {records.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => onSelectRecord(record.id)}
                      className={`flex w-full min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition ${
                        selectedRecord?.id === record.id
                          ? "bg-[#eef4fb] text-[#0f172a]"
                          : "bg-[#f8fafc] text-[#334155] hover:bg-[#eef4fb]"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${recordDotClass(
                          record,
                        )}`}
                      />
                      <span className="truncate font-semibold">
                        {record.title}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-[#64748b]">
                        {record.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default function MedicalRecordsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  const [profile, setProfile] = useState(null);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [serviceAppointments, setServiceAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  const loadRecords = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      setProfile(null);
      setDoctorAppointments([]);
      setServiceAppointments([]);
      return;
    }

    setLoading(true);
    setNotice("");

    let token = null;
    try {
      token = await getToken();
    } catch (err) {
      console.error("Failed to get Clerk token:", err);
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const profileRequest = API.get("/api/patient-profile/me", { headers });
    const doctorRequest = API.get("/api/appointments/me", { headers });
    const serviceRequest = API.get("/api/service-appointments/me", { headers });

    const [profileResult, doctorResult, serviceResult] =
      await Promise.allSettled([profileRequest, doctorRequest, serviceRequest]);

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value?.data?.profile || null);
    } else {
      console.error(
        "Medical records profile fetch failed:",
        profileResult.reason?.response?.data || profileResult.reason,
      );
      setProfile(null);
    }

    if (doctorResult.status === "fulfilled") {
      const data = doctorResult.value?.data;
      setDoctorAppointments(
        Array.isArray(data?.appointments)
          ? data.appointments
          : Array.isArray(data)
            ? data
            : [],
      );
    } else {
      console.error(
        "Medical records doctor appointments fetch failed:",
        doctorResult.reason?.response?.data || doctorResult.reason,
      );
      setDoctorAppointments([]);
    }

    if (serviceResult.status === "fulfilled") {
      const data = serviceResult.value?.data;
      setServiceAppointments(
        Array.isArray(data?.appointments)
          ? data.appointments
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [],
      );
    } else {
      console.error(
        "Medical records service appointments fetch failed:",
        serviceResult.reason?.response?.data || serviceResult.reason,
      );
      setServiceAppointments([]);
    }

    const failed = [profileResult, doctorResult, serviceResult].some(
      (result) => result.status === "rejected",
    );
    if (failed) {
      setNotice("Some medical record details could not be loaded right now.");
    }

    setLoading(false);
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const fullName =
    user?.fullName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "Patient";

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const timelineRecords = useMemo(() => {
    const doctorRecords = doctorAppointments.map((appointment) => {
      const doctorObj =
        typeof appointment.doctorId === "object" && appointment.doctorId
          ? appointment.doctorId
          : {};
      const title =
        doctorObj.name ||
        appointment.doctorName ||
        appointment.doctor ||
        "Doctor Visit";
      const subtitle =
        doctorObj.specialization ||
        doctorObj.speciality ||
        appointment.speciality ||
        appointment.specialization ||
        "Doctor consultation";
      const amount =
        appointment.fees ?? appointment.fee ?? appointment.payment?.amount ?? 0;

      return {
        id: `doctor-${appointment._id || appointment.id}`,
        kind: "doctor",
        title,
        subtitle,
        date: appointment.date || "",
        time: appointment.time || "",
        status: normalizeStatus(appointment),
        paymentMethod: appointment.payment?.method || "Cash",
        paymentStatus: appointment.payment?.status || "Pending",
        amount,
      };
    });

    const serviceRecords = serviceAppointments.map((service) => {
      const serviceObj =
        typeof service.serviceId === "object" && service.serviceId
          ? service.serviceId
          : {};
      const amount =
        service.fees ??
        service.amount ??
        service.price ??
        service.payment?.amount ??
        0;

      return {
        id: `service-${service._id || service.id}`,
        kind: "service",
        title: service.serviceName || serviceObj.name || "Hospital Service",
        subtitle: "Service or lab booking",
        date: service.date || "",
        time: getTimeFromService(service),
        status: normalizeStatus(service),
        paymentMethod: service.payment?.method || "Cash",
        paymentStatus: service.payment?.status || "Pending",
        amount,
      };
    });

    return [...doctorRecords, ...serviceRecords].sort(
      (a, b) => parseDateTime(b.date, b.time) - parseDateTime(a.date, a.time),
    );
  }, [doctorAppointments, serviceAppointments]);

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();

    return timelineRecords
      .filter((record) => {
        if (activeFilter === "doctor") return record.kind === "doctor";
        if (activeFilter === "service") return record.kind === "service";
        if (activeFilter === "completed")
          return isCompletedStatus(record.status);
        if (activeFilter === "upcoming") return isUpcomingRecord(record);
        return true;
      })
      .filter((record) => {
        if (!q) return true;
        return (
          record.title.toLowerCase().includes(q) ||
          record.subtitle.toLowerCase().includes(q) ||
          record.status.toLowerCase().includes(q)
        );
      });
  }, [activeFilter, query, timelineRecords]);

  const recordsByDate = useMemo(() => {
    return filteredRecords.reduce((groups, record) => {
      const key = record.date || "Unscheduled";
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
      return groups;
    }, {});
  }, [filteredRecords]);

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );

  const selectedRecords = recordsByDate[selectedDate] || [];
  const hasFilteredRecords = filteredRecords.length > 0;

  const completedCount = timelineRecords.filter((record) =>
    isCompletedStatus(record.status),
  ).length;
  const upcomingCount = timelineRecords.filter(isUpcomingRecord).length;

  function changeMonth(offset) {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset, 1);
      return next;
    });
    setSelectedRecordId(null);
  }

  function goToToday() {
    const today = new Date();
    setVisibleMonth(today);
    setSelectedDate(todayISO);
    setSelectedRecordId(null);
  }

  function selectDay(date) {
    setSelectedDate(date);
    setSelectedRecordId(null);
  }

  function selectRecord(date, recordId) {
    setSelectedDate(date);
    setSelectedRecordId(recordId);
  }

  if (!isLoaded || loading) {
    return (
      <section className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-32">
        <div className="mx-auto max-w-[1380px]">
          <EmptyState
            icon={FileHeart}
            title="Loading medical records"
            text="Gathering your profile, doctor visits, and service bookings."
          />
        </div>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-32">
        <div className="mx-auto max-w-[760px]">
          <EmptyState
            icon={ShieldPlus}
            title="Sign in to view medical records"
            text="Your medical records page uses your patient profile and booking history."
          />
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => clerk.openSignIn()}
              className="rounded-2xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8]"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#eef6ff] pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_48%,#eef6ff_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-16 sm:px-5 lg:px-6">
        <div className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-white/75 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e6fb] bg-white px-4 py-2 text-sm font-medium text-[#2563eb]">
                <FileHeart className="h-4 w-4" />
                Patient Medical Records
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#0f172a] md:text-5xl">
                Your Health Summary
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-[#64748b]"></p>
            </div>

            <div className="rounded-[28px] border border-[#dbe6f7] bg-[#eef4fb] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-xl font-bold text-[#2563eb] shadow-sm">
                  {getInitials(fullName)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-bold text-[#0f172a]">
                    {fullName}
                  </h2>
                  <p className="truncate text-sm text-[#64748b]">
                    {email || "No email found"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
                    Age
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#0f172a]">
                    {profile?.age ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
                    Gender
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#0f172a]">
                    {profile?.gender || "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
                    Visits
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#2563eb]">
                    {doctorAppointments.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5]">
                    Services
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#2563eb]">
                    {serviceAppointments.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {notice && (
          <div className="mb-6 flex items-center gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {notice}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            icon={HeartPulse}
            label="Allergies"
            value={profile?.allergies}
            emptyText="No allergies recorded."
          />
          <InfoCard
            icon={FileHeart}
            label="Medical History"
            value={profile?.medicalHistory}
            emptyText="No medical history recorded."
          />
          <InfoCard
            icon={Phone}
            label="Emergency Contact"
            value={profile?.emergencyContact}
            emptyText="No emergency contact saved."
          />
          <InfoCard
            icon={UserRound}
            label="Contact"
            value={profile?.phone || profile?.address}
            emptyText="No phone or address saved."
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-[#dbe6f7] bg-white px-5 py-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8aa5]">
              Total Records
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0f172a]">
              {timelineRecords.length}
            </p>
          </div>
          <div className="rounded-[24px] border border-[#dbe6f7] bg-white px-5 py-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8aa5]">
              Completed
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {completedCount}
            </p>
          </div>
          <div className="rounded-[24px] border border-[#dbe6f7] bg-white px-5 py-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8aa5]">
              Upcoming
            </p>
            <p className="mt-2 text-3xl font-bold text-[#2563eb]">
              {upcomingCount}
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/85 shadow-[0_16px_42px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="border-b border-[#e5eaf5] px-4 py-4 lg:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#0f172a]">
                  Medical Calendar
                </h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  Doctor visits and service bookings shown by month.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveFilter(filter.value)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        activeFilter === filter.value
                          ? "bg-[#2563eb] text-white"
                          : "border border-[#dbe6f7] bg-[#f8fbff] text-[#334155] hover:bg-white"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search records..."
                    className="h-10 w-full rounded-xl border border-[#e5eaf5] bg-[#f8fafc] py-2 pl-10 pr-9 text-sm text-[#0f172a] outline-none sm:w-[250px]"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-[#eef2f7] px-4 py-3 lg:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5eaf5] bg-[#f8fafc] text-[#334155] transition hover:bg-white"
                  title="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5eaf5] bg-[#f8fafc] text-[#334155] transition hover:bg-white"
                  title="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goToToday}
                  className="h-9 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8]"
                >
                  Today
                </button>
              </div>

              <div className="text-left sm:text-right">
                <h3 className="text-xl font-bold text-[#0f172a]">
                  {formatMonthYear(visibleMonth)}
                </h3>
                <p className="text-sm text-[#64748b]">
                  {filteredRecords.length} event
                  {filteredRecords.length === 1 ? "" : "s"} visible
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            {!hasFilteredRecords ? (
              <EmptyState
                icon={CheckCircle}
                title="No records found"
                text="There are no matching doctor visits or service bookings for the current filters."
              />
            ) : (
              <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 p-3 lg:p-4">
                  <div className="hidden grid-cols-7 gap-1.5 pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a98b5] md:grid">
                    {weekdays.map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  <div className="hidden grid-cols-7 gap-1.5 md:grid">
                    {calendarDays.map((day) => (
                      <CalendarDayCell
                        key={day.iso}
                        day={day}
                        records={recordsByDate[day.iso] || []}
                        isToday={day.iso === todayISO}
                        isSelected={day.iso === selectedDate}
                        onSelectDay={selectDay}
                        onSelectRecord={selectRecord}
                      />
                    ))}
                  </div>

                  <div className="space-y-2.5 md:hidden">
                    {calendarDays
                      .filter((day) => day.isCurrentMonth)
                      .map((day) => {
                        const dayRecords = recordsByDate[day.iso] || [];

                        return (
                          <section
                            key={day.iso}
                            className={`rounded-[20px] border p-3 ${
                              day.iso === selectedDate
                                ? "border-[#2563eb] bg-[#eef4fb]"
                                : "border-[#e5eaf5] bg-white"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => selectDay(day.iso)}
                              className="flex w-full items-center justify-between gap-3 text-left"
                            >
                              <span className="text-sm font-bold text-[#0f172a]">
                                {formatLongDate(day.iso)}
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#2563eb]">
                                {dayRecords.length}
                              </span>
                            </button>

                            {dayRecords.length > 0 ? (
                              <div className="mt-3 space-y-1.5">
                                {dayRecords.map((record) => (
                                  <CalendarEventChip
                                    key={record.id}
                                    record={record}
                                    onClick={() =>
                                      selectRecord(day.iso, record.id)
                                    }
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-[#94a3b8]">
                                No medical events.
                              </p>
                            )}
                          </section>
                        );
                      })}
                  </div>
                </div>

                <DayDetailsPanel
                  date={selectedDate}
                  records={selectedRecords}
                  selectedRecordId={selectedRecordId}
                  onSelectRecord={setSelectedRecordId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
