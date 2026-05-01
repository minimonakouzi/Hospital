import React, { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  BriefcaseMedical,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

function formatDateISO(iso) {
  if (!iso || typeof iso !== "string") return iso;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";
  return `${day} ${month} ${y}`;
}

function normalizeToDateString(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().split("T")[0];
}

function buildScheduleMap(schedule) {
  const map = {};
  if (!schedule || typeof schedule !== "object") return map;

  Object.entries(schedule).forEach(([k, v]) => {
    const nd = normalizeToDateString(k) || String(k);
    map[nd] = Array.isArray(v) ? v.slice() : [];
  });

  return map;
}

function getSortedScheduleDates(scheduleLike) {
  let keys = [];

  if (Array.isArray(scheduleLike)) {
    keys = scheduleLike.map(normalizeToDateString).filter(Boolean);
  } else if (scheduleLike && typeof scheduleLike === "object") {
    keys = Object.keys(scheduleLike).map(normalizeToDateString).filter(Boolean);
  }

  keys = Array.from(new Set(keys));

  const parsed = keys.map((ds) => ({ ds, date: new Date(ds) }));

  const dateVal = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  const today = new Date();
  const todayVal = dateVal(today);

  const past = parsed
    .filter((p) => dateVal(p.date) < todayVal)
    .sort((a, b) => dateVal(b.date) - dateVal(a.date));

  const future = parsed
    .filter((p) => dateVal(p.date) >= todayVal)
    .sort((a, b) => dateVal(a.date) - dateVal(b.date));

  return [...past, ...future].map((p) => p.ds);
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getAvatarTone(index) {
  const tones = [
    "bg-blue-100 text-blue-700",
    "bg-indigo-100 text-indigo-700",
    "bg-sky-100 text-sky-700",
    "bg-cyan-100 text-cyan-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
  ];
  return tones[index % tones.length];
}

function DoctorAvatar({ doc, index }) {
  const image = doc.imageUrl || doc.image || "";

  if (image) {
    return (
      <img
        src={image}
        alt={doc.name || "Doctor"}
        className="h-14 w-14 rounded-2xl object-cover ring-1 ring-blue-100"
      />
    );
  }

  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-2xl font-bold ${getAvatarTone(
        index,
      )}`}
    >
      {getInitials(doc.name)}
    </div>
  );
}

export default function ListPage({ apiBase }) {
  const API_BASE = apiBase || "http://localhost:4000";

  const [doctors, setDoctors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      const body = await res.json().catch(() => null);

      if (res.ok && body && body.success) {
        const list = Array.isArray(body.data)
          ? body.data
          : Array.isArray(body.doctors)
            ? body.doctors
            : [];

        const normalized = list.map((d) => {
          const scheduleMap = buildScheduleMap(d.schedule || {});
          return {
            ...d,
            schedule: scheduleMap,
          };
        });

        setDoctors(normalized);
      } else {
        console.error("Failed to fetch doctors", { status: res.status, body });
        setDoctors([]);
      }
    } catch (err) {
      console.error("Network error fetching doctors", err);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoctors();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = doctors;

    if (filterStatus === "available") {
      list = list.filter(
        (d) => (d.availability || "").toString().toLowerCase() === "available",
      );
    } else if (filterStatus === "unavailable") {
      list = list.filter(
        (d) => (d.availability || "").toString().toLowerCase() !== "available",
      );
    }

    if (!q) return list;

    return list.filter((d) => {
      return (
        (d.name || "").toLowerCase().includes(q) ||
        (d.specialization || "").toLowerCase().includes(q)
      );
    });
  }, [doctors, query, filterStatus]);

  const displayed = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, 6);
  }, [filtered, showAll]);

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  async function removeDoctor(id) {
    const doc = doctors.find((d) => (d._id || d.id) === id);
    if (!doc) return;

    const ok = window.confirm(`Delete ${doc.name}? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/doctors/${id}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        alert(body?.message || "Failed to delete");
        return;
      }

      setDoctors((prev) => prev.filter((p) => (p._id || p.id) !== id));
      if (expanded === id) setExpanded(null);
    } catch (err) {
      console.error("delete error", err);
      alert("Network error deleting doctor");
    }
  }

  function applyStatusFilter(status) {
    setFilterStatus((prev) => (prev === status ? "all" : status));
    setExpanded(null);
    setShowAll(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Admin Session
            </div>

            <h1 className="mt-4 text-[2rem] font-bold tracking-tight text-slate-900">
              Doctor Directory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage credentials and monitor performance of medical staff.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:flex-row xl:w-auto">
            <div className="relative w-full xl:w-[320px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctors, specializations..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => applyStatusFilter("available")}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition ${
                filterStatus === "available"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Available
            </button>

            <button
              type="button"
              onClick={() => applyStatusFilter("unavailable")}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition ${
                filterStatus === "unavailable"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Unavailable
            </button>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setExpanded(null);
                setShowAll(false);
                setFilterStatus("all");
              }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {/* Status area */}
      {loading && (
        <div className="rounded-[24px] border border-blue-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading doctors...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-[24px] border border-blue-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No doctors match your search.
        </div>
      )}

      {/* Cards */}
      {!loading &&
        displayed.map((doc, index) => {
          const id = doc._id || doc.id;
          const isOpen = expanded === id;
          const isAvailable =
            (doc.availability || "").toString().toLowerCase() === "available";

          const scheduleMap = buildScheduleMap(doc.schedule || {});
          const sortedDates = getSortedScheduleDates(scheduleMap);

          return (
            <article
              key={id}
              className={`overflow-hidden rounded-[28px] border bg-white shadow-sm transition ${
                isOpen
                  ? "border-blue-300 ring-2 ring-blue-100"
                  : "border-slate-200 hover:border-blue-200"
              }`}
            >
              {/* Summary row */}
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <DoctorAvatar doc={doc} index={index} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <h2 className="truncate text-xl font-bold text-slate-900">
                          {doc.name || "Unknown Doctor"}
                        </h2>

                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-medium text-blue-700">
                          {doc.specialization || "General"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">
                          {doc.experience || "No experience added"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {doc.patients || "N/A"} Patients
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          Fee: {doc.fee ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 xl:justify-end">
                    <div className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                      <Star className="h-4 w-4 fill-current" />
                      {doc.rating || 0}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                      aria-label={
                        isOpen ? "Collapse doctor card" : "Expand doctor card"
                      }
                    >
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <>
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                        {/* Left content */}
                        <div className="space-y-5 xl:col-span-8">
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div>
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Professional Bio
                              </div>
                              <p className="text-sm leading-7 text-slate-600">
                                “{doc.about || "No biography added yet."}”
                              </p>
                            </div>

                            <div>
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Practice Details
                              </div>

                              <div className="space-y-3 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-500">
                                    Success Rate:
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {doc.success || "N/A"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-rose-500" />
                                  <span className="font-medium text-slate-500">
                                    Location:
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {doc.location || "No location"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <BriefcaseMedical className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-slate-500">
                                    Qualifications:
                                  </span>
                                </div>

                                <div className="pl-6 text-slate-900">
                                  {doc.qualifications ||
                                    "No qualifications listed"}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Credentials & Stats
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-slate-400">
                                  Email
                                </div>
                                <div className="mt-2 break-all text-sm font-medium text-slate-900">
                                  {doc.email || "No email"}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-slate-400">
                                  Patients
                                </div>
                                <div className="mt-2 text-sm font-medium text-slate-900">
                                  {doc.patients || "N/A"}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-slate-400">
                                  Fee
                                </div>
                                <div className="mt-2 text-sm font-medium text-slate-900">
                                  ${doc.fee ?? 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right schedule box */}
                        <div className="xl:col-span-4">
                          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Upcoming Slots
                            </div>

                            {sortedDates.length === 0 ? (
                              <div className="text-sm text-slate-400">
                                No schedule has been added yet.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {sortedDates.map((date) => {
                                  const slots = scheduleMap[date] || [];
                                  return (
                                    <div key={date}>
                                      <div className="mb-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                        <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                                        {formatDateISO(date)}
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        {slots.map((slot, i) => (
                                          <span
                                            key={i}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                                          >
                                            {slot}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => removeDoctor(id)}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Profile
                      </button>

                      <div className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white">
                        Doctor Profile Active
                      </div>
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}

      {/* Show more */}
      {!loading && filtered.length > 6 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {showAll ? "Show less" : `Show more (${filtered.length - 6})`}
          </button>
        </div>
      )}
    </div>
  );
}
