import React, { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, Phone, Search, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

const API_BASE = "http://localhost:4000";
const STATUS_OPTIONS = ["Pending", "Confirmed", "Completed", "Canceled", "Rescheduled"];
const PAGE_SIZES = [25, 50, 100];

function formatDateISO(iso) {
  if (!iso) return "Not scheduled";
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
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
  } catch {
    return new Date(`${slot?.date || "1970-01-01"}T00:00:00`);
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
  if (s === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "canceled" || s === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "confirmed") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (s === "rescheduled") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function isFinalStatus(status = "") {
  const s = status.toLowerCase();
  return s === "completed" || s === "canceled" || s === "cancelled";
}

function normalizeAppointment(a) {
  const doctorName = (a.doctorId && a.doctorId.name) || a.doctorName || "";
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
}

export default function AppointmentsPage() {
  const { getToken } = useAuth();
  const isAdmin = true;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSpeciality, setFilterSpeciality] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, count: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, pageSize]);

  useEffect(() => {
    loadAppointments();
  }, [debouncedQuery, statusFilter, page, pageSize]);

  async function loadAppointments() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (debouncedQuery) params.set("search", debouncedQuery);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`${API_BASE}/api/appointments?${params.toString()}`, {
        headers: await adminAuthHeaders(getToken),
      });

      if (!res.ok) {
        throw new Error("Unable to load appointments right now.");
      }

      const data = await res.json();
      const items = (data?.appointments || []).map(normalizeAppointment);

      setAppointments(items);
      setMeta({
        page: data?.meta?.page || page,
        limit: data?.meta?.limit || pageSize,
        total: data?.meta?.total || items.length,
        count: data?.meta?.count || items.length,
      });
    } catch (err) {
      console.error("Load appointments error:", err);
      setError(err.message || "Unable to load appointments right now.");
      setAppointments([]);
      setMeta((current) => ({ ...current, count: 0 }));
    } finally {
      setLoading(false);
    }
  }

  const specialities = useMemo(() => {
    const set = new Set(appointments.map((a) => a.speciality || "General"));
    return ["all", ...Array.from(set).sort()];
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        if (
          filterSpeciality !== "all" &&
          (a.speciality || "").toLowerCase() !== filterSpeciality.toLowerCase()
        ) {
          return false;
        }

        if (filterDate && a.slot?.date !== filterDate) return false;
        return true;
      })
      .sort((a, b) => dateTimeFromSlot(b.slot).getTime() - dateTimeFromSlot(a.slot).getTime());
  }, [appointments, filterDate, filterSpeciality]);

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / pageSize));
  const pageStart = meta.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, meta.total || 0);
  const hasCurrentPageFilters = Boolean(filterDate || filterSpeciality !== "all");

  async function reloadAppointments() {
    await loadAppointments();
  }

  async function adminCancelAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt || isFinalStatus(appt.status)) return;

    const ok = window.confirm(
      `Cancel appointment for ${appt.patientName || "this patient"} with ${
        appt.doctorName || "the doctor"
      } on ${formatDateISO(appt.slot.date)} at ${appt.slot.time}?`,
    );

    if (!ok) return;

    try {
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Canceled" } : p)),
      );

      const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: await adminAuthHeaders(getToken, {
          "Content-Type": "application/json",
        }),
      });

      if (!res.ok) throw new Error("Unable to cancel this appointment.");

      const data = await res.json();
      const updated = data?.appointment || data?.appointments || null;

      if (updated) {
        setAppointments((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const normalized = normalizeAppointment(updated);
            return { ...p, ...normalized, id: normalized.id || p.id };
          }),
        );
      }

      setNotice({ type: "success", text: "Appointment canceled." });
    } catch (err) {
      console.error("Cancel error:", err);
      setNotice({ type: "error", text: "Unable to cancel this appointment." });
      await reloadAppointments();
    }
  }

  async function adminUpdateAppointmentStatus(id, nextStatus) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt || appt.status === nextStatus) return;

    const previous = appt.status;
    try {
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)),
      );

      const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
        method: "PUT",
        headers: await adminAuthHeaders(getToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Unable to update appointment status.");

      const data = await res.json().catch(() => null);
      const updated = data?.appointment;

      setAppointments((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: updated?.status || nextStatus,
                raw: updated || p.raw,
              }
            : p,
        ),
      );
      setNotice({ type: "success", text: "Appointment status updated." });
    } catch (err) {
      console.error("status update error:", err);
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: previous } : p)),
      );
      setNotice({ type: "error", text: "Unable to update appointment status." });
    }
  }

  async function adminDeleteAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt) return;

    const ok = window.confirm(
      "This will permanently delete this appointment record from history. Continue?",
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
        method: "DELETE",
        headers: await adminAuthHeaders(getToken),
      });

      if (!res.ok) throw new Error("Unable to delete this appointment record.");

      setNotice({ type: "success", text: "Appointment record deleted." });

      if (appointments.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await reloadAppointments();
      }
    } catch (err) {
      console.error("delete appointment error:", err);
      setNotice({ type: "error", text: "Unable to delete this appointment record." });
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setFilterDate("");
    setFilterSpeciality("all");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight text-slate-900">
              Patient Appointments
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review doctor consultations and update their status.
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient, phone, or notes"
              className="admin-input h-12 pl-11"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_170px_190px_auto]">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-select h-12"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="admin-input h-12"
              aria-label="Filter current page by date"
            />

            <div className="relative">
              <select
                value={filterSpeciality}
                onChange={(e) => setFilterSpeciality(e.target.value)}
                className="admin-select h-12"
                aria-label="Filter current page by specialty"
              >
                {specialities.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp === "all" ? "All Specialties" : sp}
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
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {notice.text ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-rose-100 bg-rose-50 text-rose-700"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice({ type: "", text: "" })}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf2fb] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Appointment Queue
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {hasCurrentPageFilters
                ? `${visibleAppointments.length} current-page matches. Server filters show ${pageStart}-${pageEnd} of ${meta.total}.`
                : `Showing ${pageStart}-${pageEnd} of ${meta.total}`}
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
        ) : visibleAppointments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No appointments match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#f8fbff] text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Doctor / Specialty</th>
                  <th className="px-5 py-3">Date / Time</th>
                  <th className="px-5 py-3">Fee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2fb]">
                {visibleAppointments.map((a) => {
                  const terminal = isFinalStatus(a.status);

                  return (
                    <tr key={a.id} className="align-middle transition hover:bg-[#f8fbff]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-600">
                            {getInitials(a.patientName)}
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
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {a.doctorName || "Unknown Doctor"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {a.speciality || "General"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 font-medium text-slate-800">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          {formatDateISO(a.slot.date)}
                        </div>
                        <div className="mt-1 pl-6 text-xs text-slate-500">
                          {a.slot.time || "Time N/A"}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        ${a.fee || 0}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusPillClasses(
                            a.status,
                          )}`}
                        >
                          {a.status || "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="relative w-36">
                              <select
                                value={a.status || "Pending"}
                                onChange={(event) =>
                                  adminUpdateAppointmentStatus(a.id, event.target.value)
                                }
                                disabled={terminal}
                                className={`admin-select h-10 rounded-xl ${
                                  terminal ? "cursor-not-allowed opacity-60" : ""
                                }`}
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                            {!terminal ? (
                              <button
                                onClick={() => adminCancelAppointment(a.id)}
                                className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                disabled
                                className="h-10 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-400"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => adminDeleteAppointment(a.id)}
                              className="h-10 rounded-xl border border-red-200 bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
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
