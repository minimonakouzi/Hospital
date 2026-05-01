import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Star,
  CalendarDays,
  ChevronRight,
  Stethoscope,
  MapPin,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

/* ---------------- helpers ---------------- */
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
  return `${Number(d)} ${monthNames[dateObj.getMonth()] || ""} ${y}`;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/* ---------------- page ---------------- */
export default function DoctorsPage({ apiBase }) {
  const navigate = useNavigate();
  const API = apiBase || API_BASE;

  const [doctors, setDoctors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/doctors`);
      const body = await res.json().catch(() => null);

      if (res.ok && body && body.success) {
        const list = Array.isArray(body.data)
          ? body.data
          : Array.isArray(body.doctors)
            ? body.doctors
            : [];

        const normalized = list.map((d) => ({
          ...d,
          schedule: buildScheduleMap(d.schedule || {}),
        }));

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
    return filtered.slice(0, 8);
  }, [filtered, showAll]);

  function applyStatusFilter(status) {
    setFilterStatus((prev) => (prev === status ? "all" : status));
    setExpanded(null);
    setShowAll(false);
  }

  function goToDoctor(doc) {
    const id = doc._id || doc.id;
    if (!id) return;
    navigate(`/doctors/${id}`);
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#eef6ff] pt-28">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_48%,#eef6ff_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1380px] px-4 pb-16 sm:px-6 lg:px-8">
        {/* hero */}
        <div className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-white/70 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="grid items-center gap-8 px-6 py-8 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e6fb] bg-white px-4 py-2 text-sm font-medium text-[#2563eb]">
                <Stethoscope className="h-4 w-4" />
                Revive Medical Team
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#0f172a] md:text-5xl">
                Our Medical Experts
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-[#64748b]">
                Find your ideal doctor by name or specialization and book with
                professionals who match your healthcare needs.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => applyStatusFilter("available")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filterStatus === "available"
                      ? "bg-[#2563eb] text-white"
                      : "border border-[#dbe6f7] bg-white text-[#2563eb]"
                  }`}
                >
                  Available Doctors
                </button>

                <button
                  onClick={() => applyStatusFilter("unavailable")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filterStatus === "unavailable"
                      ? "bg-[#0f172a] text-white"
                      : "border border-[#dbe6f7] bg-white text-[#334155]"
                  }`}
                >
                  Unavailable Doctors
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#dbe6f7] bg-[#eef4fb] p-5 shadow-inner">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#0f172a]">
                    Search Doctors
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Browse by name or specialization.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search doctors by name or specialization..."
                    className="h-12 w-full rounded-[18px] border border-[#dbe6f7] bg-white pl-11 pr-4 text-sm text-[#0f172a] outline-none transition focus:border-[#bfd3fa]"
                  />
                </div>

                <button
                  onClick={() => {
                    setQuery("");
                    setExpanded(null);
                    setShowAll(false);
                    setFilterStatus("all");
                  }}
                  className="h-12 rounded-[18px] border border-[#dbe6f7] bg-white px-5 text-sm font-semibold text-[#334155]"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* content */}
        {loading ? (
          <div className="rounded-[30px] border border-[#dbe6f7] bg-white/80 px-6 py-14 text-center text-[#64748b] shadow-sm">
            Loading doctors...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[30px] border border-[#dbe6f7] bg-white/80 px-6 py-14 text-center text-[#64748b] shadow-sm">
            No doctors match your search.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {displayed.map((doc) => {
                const id = doc._id || doc.id;
                const isOpen = expanded === id;
                const isAvailable =
                  String(doc.availability || "").toLowerCase() === "available";

                const scheduleMap = buildScheduleMap(doc.schedule || {});
                const sortedDates = getSortedScheduleDates(scheduleMap);

                return (
                  <article
                    key={id}
                    className="overflow-hidden rounded-[30px] border border-white/60 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.11)]"
                  >
                    <div className="p-5">
                      <div className="flex justify-center">
                        {doc.imageUrl || doc.image ? (
                          <img
                            src={doc.imageUrl || doc.image}
                            alt={doc.name}
                            className="h-24 w-24 rounded-full border-4 border-[#e7f0ff] object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#e7f0ff] bg-[#eef4fb] text-xl font-bold text-[#2563eb]">
                            {getInitials(doc.name)}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 text-center">
                        <h3 className="text-xl font-bold text-[#0f172a]">
                          {doc.name}
                        </h3>
                        <p className="mt-1 text-sm text-[#2563eb]">
                          {doc.specialization}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isAvailable ? "Available" : "Not Available"}
                        </span>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5" />
                            {doc.rating || "-"}
                          </span>
                        </span>
                      </div>

                      <div className="mt-4 rounded-[20px] bg-[#f8fbff] p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#64748b]">Experience</span>
                          <span className="font-semibold text-[#0f172a]">
                            {doc.experience ? `${doc.experience} years` : "-"}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-[#64748b]">Patients</span>
                          <span className="font-semibold text-[#0f172a]">
                            {doc.patients || "-"}
                          </span>
                        </div>

                        <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                          <span className="text-[#64748b]">Location</span>
                          <span className="text-right font-semibold text-[#0f172a]">
                            {doc.location || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => goToDoctor(doc)}
                          disabled={!isAvailable}
                          className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                            isAvailable
                              ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                              : "cursor-not-allowed bg-[#eef2f7] text-[#94a3b8]"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            Book Now
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            setExpanded((prev) => (prev === id ? null : id))
                          }
                          className="rounded-full border border-[#dbe6f7] bg-white px-4 py-3 text-sm font-semibold text-[#334155]"
                        >
                          {isOpen ? "Less" : "More"}
                        </button>
                      </div>
                    </div>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen
                          ? "max-h-[420px] border-t border-[#eef2f7]"
                          : "max-h-0"
                      }`}
                    >
                      <div className="space-y-4 bg-[#fbfdff] p-5">
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7c8aa5]">
                            About
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-[#64748b]">
                            {doc.about || "No biography available."}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7c8aa5]">
                            Qualifications
                          </h4>
                          <p className="mt-2 text-sm text-[#334155]">
                            {doc.qualifications || "-"}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7c8aa5]">
                            Schedule
                          </h4>

                          {sortedDates.length === 0 ? (
                            <p className="mt-2 text-sm text-[#94a3b8]">
                              No available schedule listed.
                            </p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {sortedDates.slice(0, 3).map((date) => (
                                <div key={date}>
                                  <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-semibold text-[#2563eb]">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {formatDateISO(date)}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(scheduleMap[date] || [])
                                      .slice(0, 4)
                                      .map((slot, idx) => (
                                        <span
                                          key={`${date}-${idx}`}
                                          className="rounded-full border border-[#dbe6f7] bg-white px-3 py-1 text-xs text-[#334155]"
                                        >
                                          {slot}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] border border-[#eaf0fb] bg-white px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-2 text-[#64748b]">
                            <MapPin className="h-4 w-4 text-[#2563eb]" />
                            Practice location
                          </span>
                          <span className="font-medium text-[#0f172a]">
                            {doc.location || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filtered.length > 8 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowAll((s) => !s)}
                  className="rounded-full border border-[#dbe6f7] bg-white px-6 py-3 text-sm font-semibold text-[#2563eb] shadow-sm"
                >
                  {showAll ? "Show Less" : `Show More (${filtered.length - 8})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
