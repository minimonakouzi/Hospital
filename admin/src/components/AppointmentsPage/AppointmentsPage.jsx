import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  Calendar,
  DollarSign,
  Phone,
  ShieldCheck,
  Check,
  X,
  MoreVertical,
} from "lucide-react";

/* ----------------------
  Config
------------------------ */
const API_BASE = "http://localhost:4000";

/* ----------------------
  Helpers
------------------------ */
function formatDateISO(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return iso;
  }
}

function dateTimeFromSlot(slot) {
  try {
    const [y, m, d] = slot.date.split("-");
    const base = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);

    const [time, ampm] = slot.time.split(" ");
    let [hh, mm] = time.split(":").map(Number);

    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;

    base.setHours(hh, mm, 0, 0);
    return base;
  } catch (e) {
    return new Date(slot.date + "T00:00:00");
  }
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getStatusPillClasses(status) {
  const s = (status || "").toLowerCase();

  if (s === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (s === "canceled" || s === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (s === "confirmed") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusNote(status) {
  const s = (status || "").toLowerCase();

  if (s === "completed") return "Successful";
  if (s === "canceled" || s === "cancelled") return "Admin Cancelled";
  if (s === "confirmed") return "Confirmed";
  return "Pending Review";
}

/* ----------------------
  Component
------------------------ */
export default function AppointmentsPage() {
  const isAdmin = true;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSpeciality, setFilterSpeciality] = useState("all");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const q = query.trim();
        const url = `${API_BASE}/api/appointments?limit=200${
          q ? `&search=${encodeURIComponent(q)}` : ""
        }`;

        const res = await fetch(url);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || `Failed to fetch (${res.status})`);
        }

        const data = await res.json();

        const items = (data?.appointments || []).map((a) => {
          const doctorName =
            (a.doctorId && a.doctorId.name) || a.doctorName || "";
          const speciality =
            (a.doctorId && a.doctorId.specialization) ||
            a.speciality ||
            a.specialization ||
            "General";
          const fee = typeof a.fees === "number" ? a.fees : a.fee || 0;

          return {
            id: a._id || a.id,
            patientName: a.patientName || "",
            age: a.age || "",
            gender: a.gender || "",
            mobile: a.mobile || "",
            doctorName,
            speciality,
            fee,
            slot: {
              date: a.date || (a.slot && a.slot.date) || "",
              time: a.time || (a.slot && a.slot.time) || "00:00 AM",
            },
            status: a.status || (a.payment && a.payment.status) || "Pending",
            raw: a,
          };
        });

        setAppointments(items);
      } catch (err) {
        console.error("Load appointments error:", err);
        setError(err.message || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const specialities = useMemo(() => {
    const set = new Set(appointments.map((a) => a.speciality || "General"));
    return ["all", ...Array.from(set)];
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return appointments.filter((a) => {
      if (
        filterSpeciality !== "all" &&
        (a.speciality || "").toLowerCase() !== filterSpeciality.toLowerCase()
      ) {
        return false;
      }

      if (filterDate && a.slot?.date !== filterDate) return false;

      if (!q) return true;

      return (
        (a.doctorName || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q) ||
        (a.patientName || "").toLowerCase().includes(q) ||
        (a.mobile || "").toLowerCase().includes(q)
      );
    });
  }, [appointments, query, filterDate, filterSpeciality]);

  const sortedFiltered = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const da = dateTimeFromSlot(a.slot).getTime();
      const db = dateTimeFromSlot(b.slot).getTime();
      return db - da;
    });
  }, [filtered]);

  const displayed = useMemo(
    () => (showAll ? sortedFiltered : sortedFiltered.slice(0, 8)),
    [sortedFiltered, showAll],
  );

  async function reloadAppointments() {
    try {
      const reload = await fetch(`${API_BASE}/api/appointments?limit=200`);
      if (!reload.ok) return;

      const body = await reload.json();
      const items = (body?.appointments || []).map((a) => ({
        id: a._id || a.id,
        patientName: a.patientName || "",
        age: a.age || "",
        gender: a.gender || "",
        mobile: a.mobile || "",
        doctorName: (a.doctorId && a.doctorId.name) || a.doctorName || "",
        speciality:
          (a.doctorId && a.doctorId.specialization) ||
          a.speciality ||
          a.specialization ||
          "General",
        fee: typeof a.fees === "number" ? a.fees : a.fee || 0,
        slot: {
          date: a.date || (a.slot && a.slot.date) || "",
          time: a.time || (a.slot && a.slot.time) || "00:00 AM",
        },
        status: a.status || (a.payment && a.payment.status) || "Pending",
        raw: a,
      }));

      setAppointments(items);
    } catch (e) {
      console.error("reloadAppointments failed:", e);
    }
  }

  async function adminCancelAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt) return;

    const statusLower = (appt.status || "").toLowerCase();
    const isCancelled =
      statusLower === "canceled" || statusLower === "cancelled";
    const isCompleted = statusLower === "completed";

    if (isCancelled || isCompleted) return;

    const ok = window.confirm(
      `As admin, mark appointment for ${appt.patientName} with ${
        appt.doctorName
      } on ${formatDateISO(appt.slot.date)} at ${appt.slot.time} as CANCELLED?`,
    );

    if (!ok) return;

    try {
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Canceled" } : p)),
      );
      setShowAll(true);

      const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Cancel failed (${res.status})`);
      }

      const data = await res.json();
      const updated = data?.appointment || data?.appointments || null;

      if (updated) {
        setAppointments((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: updated.status || "Canceled",
                  slot: {
                    date: updated.date || p.slot.date,
                    time: updated.time || p.slot.time,
                  },
                  raw: updated,
                }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error("Cancel error:", err);
      setError(err.message || "Failed to cancel appointment");
      await reloadAppointments();
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight text-slate-900">
              Patient Appointments
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track and manage all upcoming or completed doctor consultations.
            </p>
          </div>

          <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-medium text-blue-700">
            <ShieldCheck className="h-4 w-4" />
            Secure Admin Session
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctor, patient, or specialty..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setShowAll(false);
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300"
            />

            <select
              value={filterSpeciality}
              onChange={(e) => {
                setFilterSpeciality(e.target.value);
                setShowAll(false);
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300"
            >
              {specialities.map((sp) => (
                <option key={sp} value={sp}>
                  {sp === "all" ? "All Specialties" : sp}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setQuery("");
                setFilterDate("");
                setFilterSpeciality("all");
                setShowAll(false);
              }}
              className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <div className="rounded-[24px] border border-blue-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
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
            <div className="rounded-[24px] border border-blue-100 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              No appointments match your filters.
            </div>
          ) : (
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {displayed.map((a) => {
                const statusLower = (a.status || "").toLowerCase();
                const isCancelled =
                  statusLower === "canceled" || statusLower === "cancelled";
                const isCompleted = statusLower === "completed";
                const isDisabled = isCancelled || isCompleted;

                return (
                  <article
                    key={a.id}
                    className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <span className="text-sm font-bold">
                            {getInitials(a.patientName)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-bold text-slate-900">
                            {a.patientName}
                          </h3>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {a.age ? `${a.age} YRS` : "N/A"}
                            {a.gender ? ` • ${a.gender}` : ""}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50"
                        aria-label="Appointment details"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <div className="text-base font-semibold text-blue-700">
                        {a.doctorName || "Unknown Doctor"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {a.speciality || "General"}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <div className="inline-flex items-center gap-2 text-slate-500">
                        <Phone className="h-4 w-4" />
                        <span>{a.mobile || "No phone"}</span>
                      </div>

                      <div className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <DollarSign className="h-4 w-4" />
                        <span>{a.fee}</span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="inline-flex items-center gap-2 text-slate-700">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">
                          {formatDateISO(a.slot.date)}
                        </span>
                      </div>
                      <div className="mt-1 pl-6 text-sm text-slate-500">
                        {a.slot.time}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusPillClasses(
                            a.status,
                          )}`}
                        >
                          {a.status || "Pending"}
                        </div>

                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {getStatusNote(a.status)}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="mt-4 flex items-center justify-end">
                          {!isDisabled ? (
                            <button
                              onClick={() => adminCancelAppointment(a.id)}
                              title="Admin Cancel"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {isCompleted ? "Completed" : "Admin Cancelled"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {sortedFiltered.length > 8 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="rounded-[22px] border border-slate-200 bg-white px-8 py-4 text-xl font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {showAll
                  ? "Show less"
                  : `Show more (${sortedFiltered.length - 8})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
