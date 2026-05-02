import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  Users,
  CalendarRange,
  DollarSign,
  CheckCircle2,
  XCircle,
  UserRoundCheck,
  Activity,
  Stethoscope,
} from "lucide-react";

/* ----------------------
  Config
------------------------ */
const API_BASE = "http://localhost:4000";
const PATIENT_COUNT_API = `${API_BASE}/api/appointments/paitents/count`;

/* ----------------------
  Helpers
------------------------ */
const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeDoctor(doc) {
  const id = doc._id || doc.id || String(Math.random()).slice(2);

  const name =
    doc.name ||
    doc.fullName ||
    `${doc.firstName || ""} ${doc.lastName || ""}`.trim() ||
    "Unknown";

  const specialization =
    doc.specialization ||
    doc.speciality ||
    (Array.isArray(doc.specializations)
      ? doc.specializations.join(", ")
      : "") ||
    "General";

  const fee = safeNumber(
    doc.fee ?? doc.fees ?? doc.consultationFee ?? doc.consultation_fee ?? 0,
    0,
  );

  const image = doc.imageUrl || doc.image || doc.avatar || "";
  const location = doc.location || doc.raw?.location || "";

  const appointments = {
    total:
      doc.appointments?.total ??
      doc.totalAppointments ??
      doc.appointmentsTotal ??
      0,
    completed:
      doc.appointments?.completed ??
      doc.completedAppointments ??
      doc.appointmentsCompleted ??
      0,
    canceled:
      doc.appointments?.canceled ??
      doc.canceledAppointments ??
      doc.appointmentsCanceled ??
      0,
  };

  let earnings = null;
  if (doc.earnings !== undefined && doc.earnings !== null) {
    earnings = safeNumber(doc.earnings, 0);
  } else if (doc.revenue !== undefined && doc.revenue !== null) {
    earnings = safeNumber(doc.revenue, 0);
  } else if (appointments.completed && fee) {
    earnings = fee * safeNumber(appointments.completed, 0);
  } else {
    earnings = 0;
  }

  return {
    id,
    name,
    specialization,
    fee,
    image,
    location,
    appointments,
    earnings,
    raw: doc,
  };
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getAvatarTone(index) {
  const tones = [
    "bg-blue-100 text-blue-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
  ];
  return tones[index % tones.length];
}

/* ----------------------
  Small UI pieces
------------------------ */
function MetricCard({ icon, label, value, iconWrapClass = "" }) {
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex min-h-[92px] items-stretch gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-2xl ${iconWrapClass}`}
        >
          {icon}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="min-h-[32px] text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </div>

          <div className="text-[2rem] font-bold leading-none tabular-nums text-slate-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorAvatar({ name, image, index }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-12 w-12 rounded-2xl object-cover ring-1 ring-blue-100"
      />
    );
  }

  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-2xl font-semibold ${getAvatarTone(
        index,
      )}`}
    >
      {getInitials(name)}
    </div>
  );
}

/* ----------------------
  Main component
------------------------ */
export default function DashboardPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [patientCount, setPatientCount] = useState(null);
  const [patientCountLoading, setPatientCountLoading] = useState(false);

  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDoctors() {
      setLoading(true);
      setError(null);

      try {
        const url = `${API_BASE}/api/doctors?limit=200`;
        const res = await fetch(url);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.message || `Failed to fetch doctors (${res.status})`,
          );
        }

        const body = await res.json();

        let list = [];
        if (Array.isArray(body)) list = body;
        else if (Array.isArray(body.doctors)) list = body.doctors;
        else if (Array.isArray(body.data)) list = body.data;
        else if (Array.isArray(body.items)) list = body.items;
        else {
          const firstArray = Object.values(body).find((v) => Array.isArray(v));
          if (firstArray) list = firstArray;
        }

        const normalized = list.map((d) => normalizeDoctor(d));
        if (mounted) setDoctors(normalized);
      } catch (err) {
        console.error("Failed to load doctors:", err);
        if (mounted) {
          setError(err.message || "Failed to load doctors");
          setDoctors([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDoctors();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPatientCount() {
      setPatientCountLoading(true);

      try {
        const res = await fetch(PATIENT_COUNT_API);

        if (!res.ok) {
          if (mounted) setPatientCount(0);
          return;
        }

        const body = await res.json().catch(() => ({}));
        const count = Number(
          body?.count ?? body?.totalUsers ?? body?.data ?? 0,
        );

        if (mounted) setPatientCount(Number.isNaN(count) ? 0 : count);
      } catch (err) {
        console.error("Failed to fetch patient count:", err);
        if (mounted) setPatientCount(0);
      } finally {
        if (mounted) setPatientCountLoading(false);
      }
    }

    loadPatientCount();

    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalDoctors = doctors.length;
    const totalAppointments = doctors.reduce(
      (sum, d) => sum + safeNumber(d.appointments?.total, 0),
      0,
    );
    const totalEarnings = doctors.reduce(
      (sum, d) => sum + safeNumber(d.earnings, 0),
      0,
    );
    const completed = doctors.reduce(
      (sum, d) => sum + safeNumber(d.appointments?.completed, 0),
      0,
    );
    const canceled = doctors.reduce(
      (sum, d) => sum + safeNumber(d.appointments?.canceled, 0),
      0,
    );
    const totalLoginPatients =
      doctors.reduce((sum, d) => sum + (d.raw?.loginPatientsCount ?? 0), 0) ||
      0;

    return {
      totalDoctors,
      totalAppointments,
      totalEarnings,
      completed,
      canceled,
      totalLoginPatients,
    };
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;

    const qNum = Number(q);

    return doctors.filter((d) => {
      if ((d.name || "").toLowerCase().includes(q)) return true;
      if ((d.specialization || "").toLowerCase().includes(q)) return true;
      if (String(d.fee).includes(q)) return true;
      if (!Number.isNaN(qNum) && d.fee <= qNum) return true;
      return false;
    });
  }, [doctors, query]);

  const metrics = [
    {
      label: "Total Doctors",
      value: totals.totalDoctors,
      icon: <Stethoscope className="h-6 w-6 text-blue-600" />,
      iconWrapClass: "bg-blue-50",
    },
    {
      label: "Registered Users",
      value: patientCountLoading
        ? "..."
        : (patientCount ?? totals.totalLoginPatients),
      icon: <UserRoundCheck className="h-6 w-6 text-indigo-600" />,
      iconWrapClass: "bg-indigo-50",
    },
    {
      label: "Appointments",
      value: totals.totalAppointments,
      icon: <CalendarRange className="h-6 w-6 text-violet-600" />,
      iconWrapClass: "bg-violet-50",
    },
    {
      label: "Total Earnings",
      value: `$${totals.totalEarnings.toLocaleString()}`,
      icon: <DollarSign className="h-6 w-6 text-emerald-600" />,
      iconWrapClass: "bg-emerald-50",
    },
    {
      label: "Completed",
      value: totals.completed,
      icon: <CheckCircle2 className="h-6 w-6 text-cyan-600" />,
      iconWrapClass: "bg-cyan-50",
    },
    {
      label: "Canceled",
      value: totals.canceled,
      icon: <XCircle className="h-6 w-6 text-rose-600" />,
      iconWrapClass: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <section className="rounded-3xl border border-[#dbe6f7] bg-[#eef4fb] p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#dbe6f7]">
            <Activity className="h-5 w-5 text-[#2563eb]" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Key Metrics
            </h2>
            <p className="text-sm text-slate-500">
              Live overview of hospital dashboard statistics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {metrics.map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              icon={item.icon}
              iconWrapClass={item.iconWrapClass}
            />
          ))}
        </div>
      </section>

      {/* Doctors directory */}
      <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#eef2f7] px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[1.75rem] font-bold tracking-tight text-slate-900">
              Doctors Directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage and view doctor statistics
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-[320px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name / specialization / fee"
                className="h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              />
            </div>

            <button
              onClick={() => setQuery("")}
              className="h-11 rounded-2xl border border-[#dbe6f7] bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-[#f8fbff]"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-slate-100 px-6 py-4 text-sm text-rose-600">
            Error loading doctors: {error}
          </div>
        )}

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Loading doctors...
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full">
                <thead className="bg-[#f8fbff]">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Doctor
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Specialization
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Fee
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Appointments
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Completed
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Canceled
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Total Earnings
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDoctors.map((doctor, index) => (
                    <tr
                      key={doctor.id}
                      className="border-t border-[#eef2f7] transition hover:bg-[#f8fbff]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <DoctorAvatar
                            name={doctor.name}
                            image={doctor.image}
                            index={index}
                          />

                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-slate-900">
                              {doctor.name}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-400">
                              ID: {doctor.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800">
                          {doctor.specialization}
                        </div>
                        {doctor.location ? (
                          <div className="mt-1 text-xs text-slate-400">
                            {doctor.location}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-xl bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                          ${doctor.fee}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center text-sm font-semibold text-slate-800">
                        {doctor.appointments.total}
                      </td>

                      <td className="px-6 py-4 text-center text-sm font-semibold text-cyan-600">
                        {doctor.appointments.completed}
                      </td>

                      <td className="px-6 py-4 text-center text-sm font-semibold text-rose-600">
                        {doctor.appointments.canceled}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">
                        ${doctor.earnings.toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {!filteredDoctors.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-sm text-slate-500"
                      >
                        No doctors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-4 p-4 lg:hidden">
              {filteredDoctors.length ? (
                filteredDoctors.map((doctor, index) => (
                  <div
                    key={doctor.id}
                    className="rounded-3xl border border-[#dbe6f7] bg-[#fbfdff] p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <DoctorAvatar
                        name={doctor.name}
                        image={doctor.image}
                        index={index}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-slate-900">
                          {doctor.name}
                        </div>
                        <div className="truncate text-sm text-slate-500">
                          {doctor.specialization}
                        </div>
                      </div>
                      <span className="rounded-xl bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                        ${doctor.fee}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-[#f8fbff] p-3">
                      <div className="text-center">
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Appts
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {doctor.appointments.total}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Done
                        </div>
                        <div className="mt-1 font-semibold text-cyan-600">
                          {doctor.appointments.completed}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Cancel
                        </div>
                        <div className="mt-1 font-semibold text-rose-600">
                          {doctor.appointments.canceled}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Total Earnings</span>
                      <span className="font-bold text-emerald-600">
                        ${doctor.earnings.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-[#dbe6f7] bg-white p-6 text-center text-sm text-slate-500">
                  No doctors found.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#eef2f7] px-6 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing {filteredDoctors.length} of {doctors.length} doctors
              </div>

              <div className="flex items-center gap-3">
                <button className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-2 text-slate-400">
                  Previous
                </button>
                <button className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-2 text-slate-400">
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
