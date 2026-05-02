import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  CalendarDays,
  Clock,
  CreditCard,
  Wallet,
  CheckCircle,
  XCircle,
  Bell,
  Search,
  Stethoscope,
  FlaskConical,
  FileText,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API = axios.create({ baseURL: API_BASE });

/* -------------------- Helpers -------------------- */
function pad(n) {
  return String(n ?? 0).padStart(2, "0");
}

function parseDateTime(dateStr, timeStr) {
  const fast = new Date(`${dateStr} ${timeStr}`);
  if (!isNaN(fast)) return fast;

  const parts = (dateStr || "").split(" ");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const month = months[m];
    let [t, ampm] = (timeStr || "").split(" ");
    let [hh, mm] = (t || "0:00").split(":");
    hh = Number(hh || 0);
    mm = Number(mm || 0);

    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;

    return new Date(Number(y), month, Number(d), hh, mm);
  }

  const iso = new Date(dateStr);
  if (!isNaN(iso)) return iso;
  return new Date();
}

function computeStatus(item) {
  const now = new Date();
  if (!item) return "Pending";

  if (item.status === "Canceled") return "Canceled";
  if (item.status === "Rescheduled") {
    if (
      item.rescheduledTo &&
      item.rescheduledTo.date &&
      item.rescheduledTo.time
    ) {
      const dt = parseDateTime(
        item.rescheduledTo.date,
        item.rescheduledTo.time,
      );
      if (now >= dt) return "Completed";
    }
    return "Rescheduled";
  }
  if (item.status === "Completed") return "Completed";
  if (item.status === "Confirmed") {
    const dtConfirmed = parseDateTime(item.date, item.time);
    if (now >= dtConfirmed) return "Completed";
    return "Confirmed";
  }
  if (item.status === "Pending") {
    const dtPending = parseDateTime(item.date, item.time);
    if (now >= dtPending) return "Completed";
    return "Pending";
  }

  const dt = parseDateTime(item.date, item.time);
  if (now >= dt) return "Completed";
  return item.confirmed ? "Confirmed" : "Pending";
}

function formatDateNice(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return dateStr;
}

function normalizeRescheduled(rt) {
  if (!rt) return null;
  if (rt.date && rt.time) return { date: rt.date, time: rt.time };
  if (
    rt.date &&
    (rt.hour !== undefined || rt.minute !== undefined || rt.ampm)
  ) {
    const hour = rt.hour ?? 0;
    const minute = rt.minute ?? 0;
    const ampm = rt.ampm ?? "";
    return { date: rt.date, time: `${hour}:${pad(minute)} ${ampm}` };
  }
  return {
    date: rt.date || rt?.dateString || "",
    time:
      rt.time ||
      (rt.hour
        ? `${rt.hour}:${pad(rt.minute || 0)} ${rt.ampm || ""}`
        : rt?.timeString || ""),
  };
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/* -------------------- Badges -------------------- */
function PaymentBadge({ payment }) {
  return payment === "Online" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
      <CreditCard className="h-3.5 w-3.5" /> Online
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      <Wallet className="h-3.5 w-3.5" /> Cash
    </span>
  );
}

function StatusBadge({ itemStatus }) {
  if (itemStatus === "Completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle className="h-3.5 w-3.5" /> Completed
      </span>
    );

  if (itemStatus === "Confirmed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        <Bell className="h-3.5 w-3.5" /> Confirmed
      </span>
    );

  if (itemStatus === "Pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
        <Clock className="h-3.5 w-3.5" /> Pending
      </span>
    );

  if (itemStatus === "Canceled")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
        <XCircle className="h-3.5 w-3.5" /> Canceled
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      <CalendarDays className="h-3.5 w-3.5" /> Rescheduled
    </span>
  );
}

function PrescriptionBadge({ status = "Not Required" }) {
  if (status === "Submitted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <FileText className="h-3.5 w-3.5" /> Prescription Submitted
      </span>
    );
  }
  if (status === "Required" || status === "Missing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <FileText className="h-3.5 w-3.5" /> Prescription Missing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      <FileText className="h-3.5 w-3.5" /> Prescription Not Required
    </span>
  );
}

/* -------------------- Cards -------------------- */
function EmptyState({ text }) {
  return (
    <div className="rounded-[26px] border border-[#dbe6f7] bg-white/80 px-6 py-12 text-center text-[#64748b] shadow-sm">
      {text}
    </div>
  );
}

function Avatar({ image, label }) {
  if (image) {
    return (
      <img
        src={image}
        alt={label}
        className="h-20 w-20 rounded-full border-4 border-[#e7f0ff] object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#e7f0ff] bg-[#eef4fb] text-xl font-bold text-[#2563eb] shadow-sm">
      {getInitials(label)}
    </div>
  );
}

function DoctorAppointmentCard({ item }) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-white/60 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.11)]">
      <div className="p-5">
        <div className="flex justify-center">
          <Avatar image={item.image} label={item.doctor} />
        </div>

        <div className="mt-4 text-center">
          <h3 className="text-[1.65rem] font-bold leading-tight text-[#0f172a]">
            {item.doctor}
          </h3>
          <p className="mt-1 text-sm text-[#2563eb]">
            {item.specialization || "-"}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm font-medium text-[#334155]">
            <CalendarDays className="h-4 w-4 text-[#2563eb]" />
            {formatDateNice(item.date)}
          </div>

          <div className="flex items-center justify-center gap-2 rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm font-medium text-[#334155]">
            <Clock className="h-4 w-4 text-[#2563eb]" />
            {item.time}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <PaymentBadge payment={item.payment} />
          <StatusBadge itemStatus={item.status} />
          <PrescriptionBadge status={item.prescriptionStatus} />
        </div>
      </div>
    </article>
  );
}

function ServiceAppointmentCard({ item }) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-white/60 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.11)]">
      <div className="p-5">
        <div className="flex justify-center">
          <Avatar image={item.image} label={item.name} />
        </div>

        <div className="mt-4 text-center">
          <h3 className="text-[1.55rem] font-bold leading-tight text-[#0f172a]">
            {item.name}
          </h3>
          <p className="mt-2 text-2xl font-bold text-[#2563eb]">
            ${item.price}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm font-medium text-[#334155]">
            <CalendarDays className="h-4 w-4 text-[#2563eb]" />
            {formatDateNice(item.date)}
          </div>

          <div className="flex items-center justify-center gap-2 rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm font-medium text-[#334155]">
            <Clock className="h-4 w-4 text-[#2563eb]" />
            {item.time}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <PaymentBadge payment={item.payment} />
          <StatusBadge itemStatus={item.status} />
        </div>
      </div>
    </article>
  );
}

/* -------------------- Component -------------------- */
export default function AppointmentPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const [doctorAppts, setDoctorAppts] = useState([]);
  const [serviceAppts, setServiceAppts] = useState([]);

  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  /* -------------------- Fetch Doctor Appointments -------------------- */
  const loadDoctorAppointments = useCallback(async () => {
    if (!isLoaded) return;
    setLoadingDoctors(true);
    setError(null);

    let token = null;
    try {
      token = await getToken();
    } catch (err) {
      console.error("Failed to get Clerk token (frontend):", err);
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const resp = await API.get("/api/appointments/me", { headers });

      const fetched =
        resp?.data?.appointments ?? resp?.data?.data ?? resp?.data ?? [];
      const arr = Array.isArray(fetched) ? fetched : [];

      const doctors = arr.filter((a) => {
        return (
          (a.doctorId !== undefined && a.doctorId !== null) ||
          !!a.doctorName ||
          !a.serviceId
        );
      });

      setDoctorAppts(doctors);
    } catch (err) {
      console.error(
        "Error calling /api/appointments/me:",
        err?.response?.data || err.message || err,
      );

      if (user?.id) {
        try {
          const debugResp = await API.get(
            `/api/appointments/me?createdBy=${user.id}`,
            { headers },
          );

          const fetched =
            debugResp?.data?.appointments ??
            debugResp?.data?.data ??
            debugResp?.data ??
            [];
          const arr = Array.isArray(fetched) ? fetched : [];
          const doctors = arr.filter(
            (a) =>
              (a.doctorId !== undefined && a.doctorId !== null) ||
              !!a.doctorName ||
              !a.serviceId,
          );
          setDoctorAppts(doctors);
        } catch (err2) {
          console.error(
            "Debug fallback failed (doctors):",
            err2?.response?.data || err2.message || err2,
          );
          setError((prev) =>
            prev
              ? prev + " | Doctors failed"
              : "Failed to load doctor appointments.",
          );
          setDoctorAppts([]);
        }
      } else {
        setError((prev) =>
          prev
            ? prev + " | No user id for doctors"
            : "Failed to load doctor appointments.",
        );
        setDoctorAppts([]);
      }
    } finally {
      setLoadingDoctors(false);
    }
  }, [isLoaded, getToken, user]);

  /* -------------------- Fetch Service Appointments -------------------- */
  const loadServiceAppointments = useCallback(async () => {
    if (!isLoaded) return;
    setLoadingServices(true);
    setError(null);

    let token = null;
    try {
      token = await getToken();
    } catch (err) {
      console.error("Failed to get Clerk token (frontend): err", err);
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const resp = await API.get("/api/service-appointments/me", { headers });

      const fetched =
        resp?.data?.appointments ?? resp?.data?.data ?? resp?.data ?? [];
      const arr = Array.isArray(fetched) ? fetched : [];

      setServiceAppts(arr);
    } catch (err) {
      console.error(
        "Error calling /api/service-appointments/me:",
        err?.response?.data || err.message || err,
      );

      if (user?.id) {
        try {
          const debugResp = await API.get(
            `/api/service-appointments/me?createdBy=${user.id}`,
            { headers },
          );

          const fetched =
            debugResp?.data?.appointments ??
            debugResp?.data?.data ??
            debugResp?.data ??
            [];
          const arr = Array.isArray(fetched) ? fetched : [];
          setServiceAppts(arr);
        } catch (err2) {
          console.error(
            "Debug fallback failed (services):",
            err2?.response?.data || err2.message || err2,
          );
          setError((prev) =>
            prev
              ? prev + " | Services failed"
              : "Failed to load service appointments.",
          );
          setServiceAppts([]);
        }
      } else {
        setError((prev) =>
          prev
            ? prev + " | No user id for services"
            : "Failed to load service appointments.",
        );
        setServiceAppts([]);
      }
    } finally {
      setLoadingServices(false);
    }
  }, [isLoaded, getToken, user]);

  /* -------------------- Combined loader -------------------- */
  useEffect(() => {
    loadDoctorAppointments();
    loadServiceAppointments();
  }, [
    isLoaded,
    isSignedIn,
    user,
    loadDoctorAppointments,
    loadServiceAppointments,
  ]);

  /* -------------------- Normalization for UI -------------------- */
  const appointmentData = useMemo(() => {
    return doctorAppts
      .map((a) => {
        const id = a._id || a.id || String(a._id || "");
        const doctorObj =
          typeof a.doctorId === "object" && a.doctorId ? a.doctorId : {};
        const image =
          doctorObj.imageUrl ||
          doctorObj.image ||
          doctorObj.avatar ||
          a.doctorImage?.url ||
          a.doctorImage ||
          "";
        const doctorName =
          (doctorObj.name && String(doctorObj.name).trim()) ||
          (a.doctorName && String(a.doctorName).trim()) ||
          (a.doctor && String(a.doctor).trim()) ||
          (a.patientName && String(a.patientName).trim()) ||
          "Doctor";

        const specialization =
          doctorObj.specialization || a.specialization || a.speciality || "";
        const experience = doctorObj.experience || a.experience || "";
        const date = a.date || "";
        let time = a.time || "";

        if (!time) {
          if (a.hour !== undefined && a.minute !== undefined && a.ampm) {
            time = `${a.hour}:${pad(a.minute)} ${a.ampm}`;
          } else if (a.hour !== undefined && a.ampm) {
            time = `${a.hour}:00 ${a.ampm}`;
          }
        }

        const payment = (a.payment && a.payment.method) || "Cash";
        const status =
          a.status ||
          (a.payment && a.payment.status === "Paid" ? "Confirmed" : "Pending");
        const rescheduledTo = normalizeRescheduled(
          a.rescheduledTo || {
            date: a.rescheduledDate,
            time: a.rescheduledTime,
          },
        );

        return {
          id,
          image,
          doctor: doctorName,
          specialization,
          experience,
          date,
          time,
          payment,
          status,
          rescheduledTo,
        };
      })
      .map((x) => ({ ...x, status: computeStatus(x) }));
  }, [doctorAppts]);

  const serviceData = useMemo(() => {
    return serviceAppts
      .map((s) => {
        const id = s._id || s.id || String(s._id || "");
        const svc =
          typeof s.serviceId === "object" && s.serviceId ? s.serviceId : {};
        const image =
          svc.imageUrl ||
          svc.image ||
          svc.imageSmall ||
          s.serviceImage?.url ||
          s.serviceImage ||
          "";
        const name = s.serviceName || svc.name || svc.title || "Service";
        const price = s.fees ?? s.amount ?? s.price ?? 0;
        const date = s.date || "";
        let time = s.time || "";

        if (!time) {
          if (s.hour !== undefined && s.minute !== undefined && s.ampm) {
            time = `${s.hour}:${pad(s.minute)} ${s.ampm}`;
          } else if (s.hour !== undefined && s.ampm) {
            time = `${s.hour}:00 ${s.ampm}`;
          }
        }

        const payment = (s.payment && s.payment.method) || "Cash";
        const status =
          s.status ||
          (s.payment && s.payment.status === "Paid" ? "Confirmed" : "Pending");

        return {
          id,
          image,
          name,
          price,
          date,
          time,
          payment,
          status,
          prescriptionStatus: s.prescriptionStatus || "Not Required",
        };
      })
      .map((x) => ({ ...x, status: computeStatus(x) }));
  }, [serviceAppts]);

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return appointmentData;
    return appointmentData.filter(
      (item) =>
        (item.doctor || "").toLowerCase().includes(q) ||
        (item.specialization || "").toLowerCase().includes(q),
    );
  }, [appointmentData, query]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return serviceData;
    return serviceData.filter((item) =>
      (item.name || "").toLowerCase().includes(q),
    );
  }, [serviceData, query]);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#eef6ff] pt-28">
      <Toaster position="top-right" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_48%,#eef6ff_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1380px] px-4 pb-16 sm:px-6 lg:px-8">
        {/* hero */}
        <div className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-white/70 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="grid items-center gap-8 px-6 py-8 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e6fb] bg-white px-4 py-2 text-sm font-medium text-[#2563eb]">
                <CalendarDays className="h-4 w-4" />
                Your Medical Bookings
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#0f172a] md:text-5xl">
                Appointments & Services
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-[#64748b]">
                Review your booked doctor appointments and services in the same
                clean Revive theme, without changing any backend behavior.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#dbe6f7] bg-[#eef4fb] p-5 shadow-inner">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow-sm">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#0f172a]">
                    Search Bookings
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Search by doctor, specialization, or service.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your bookings..."
                    className="h-12 w-full rounded-[18px] border border-[#dbe6f7] bg-white pl-11 pr-4 text-sm text-[#0f172a] outline-none transition focus:border-[#bfd3fa]"
                  />
                </div>

                <button
                  onClick={() => setQuery("")}
                  className="h-12 rounded-[18px] border border-[#dbe6f7] bg-white px-5 text-sm font-semibold text-[#334155]"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor appointments */}
        <div className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#0f172a]">
                Your Doctor Appointments
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                {filteredDoctors.length} appointment
                {filteredDoctors.length === 1 ? "" : "s"} found
              </p>
            </div>
          </div>

          {loadingDoctors ? (
            <EmptyState text="Loading doctor appointments..." />
          ) : filteredDoctors.length === 0 ? (
            <EmptyState text="No doctor appointments found." />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {filteredDoctors.map((item) => (
                <DoctorAppointmentCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Service appointments */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow-sm">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#0f172a]">
                Your Booked Services
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                {filteredServices.length} service
                {filteredServices.length === 1 ? "" : "s"} found
              </p>
            </div>
          </div>

          {loadingServices ? (
            <EmptyState text="Loading service appointments..." />
          ) : filteredServices.length === 0 ? (
            <EmptyState text="No booked services found." />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {filteredServices.map((item) => (
                <ServiceAppointmentCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-8 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
