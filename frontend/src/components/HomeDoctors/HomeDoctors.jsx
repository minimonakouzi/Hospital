import React, { useEffect, useState } from "react";
import {
  Medal,
  ChevronsRight,
  MousePointer2Off,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";

const HomeDoctors = ({ apiBase, previewCount = 8 }) => {
  const API_BASE = apiBase || "http://localhost:4000";
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE}/api/doctors`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            (json && json.message) || `Failed to load doctors (${res.status})`;
          if (!mounted) return;
          setError(msg);
          setDoctors([]);
          setLoading(false);
          return;
        }

        const items = (json && (json.data || json)) || [];
        const normalized = (Array.isArray(items) ? items : []).map((d) => {
          const id = d._id || d.id;
          const image =
            d.imageUrl || d.image || d.imageSmall || d.imageSrc || "";

          const available =
            (typeof d.availability === "string"
              ? d.availability.toLowerCase() === "available"
              : typeof d.available === "boolean"
                ? d.available
                : d.availability === true) || d.availability === "Available";

          return {
            id,
            name: d.name || "Unknown",
            specialization: d.specialization || "",
            image,
            experience:
              d.experience || d.experience === 0 ? String(d.experience) : "",
            fee: d.fee ?? d.price ?? 0,
            available,
            raw: d,
          };
        });

        if (!mounted) return;
        setDoctors(normalized);
      } catch (err) {
        if (!mounted) return;
        console.error("load doctors error:", err);
        setError("Network error while loading doctors.");
        setDoctors([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [API_BASE]);

  const preview = doctors.slice(0, previewCount);

  return (
    <section className="w-full px-0 py-4 md:py-6">
      <div className="relative w-full overflow-hidden border-y border-white/20 px-4 py-8 backdrop-blur-xl md:px-8 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.08)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.24),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_62%_76%,rgba(34,211,238,0.08),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#bfdbfe]/60" />

        <div className="relative z-10 mx-auto max-w-[1380px]">
          <div className="overflow-hidden rounded-[34px] border border-white/55 bg-white/26 px-6 py-8 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl md:px-8 md:py-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563eb]">
                  <ShieldCheck className="h-4 w-4" />
                  Verified Specialists
                </div>

                <h2 className="mt-4 text-3xl font-bold leading-tight text-[#0f172a] md:text-4xl">
                  Our Medical Team
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#475569] md:text-base">
                  Book appointments quickly with our trusted doctors and explore
                  a team of experienced specialists across different medical
                  fields.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-full border border-white/70 bg-white/45 px-4 py-2 text-xs font-semibold text-[#64748b]">
                  {loading ? "Loading..." : `${preview.length} doctors shown`}
                </div>

                <Link
                  to="/doctors"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]"
                >
                  View All
                  <ChevronsRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-rose-200 bg-white/40 p-5 text-sm text-rose-700">
                <div>{error}</div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-full border border-white/70 bg-white/50 px-4 py-2 font-semibold text-rose-700 transition hover:bg-white/70"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[340px] animate-pulse rounded-[28px] border border-white/60 bg-white/30"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {preview.map((doctor) => {
                  const available = doctor.available;

                  return (
                    <article
                      key={doctor.id || doctor.name}
                      className="group overflow-hidden rounded-[28px] border border-white/60 bg-white/30 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/40"
                    >
                      <div className="rounded-[24px] border border-white/55 bg-white/24 p-4">
                        <div className="relative mx-auto w-full max-w-[150px]">
                          <div className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_70%)]" />

                          {!available && (
                            <span className="absolute right-2 top-2 z-10 rounded-full bg-slate-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                              Not available
                            </span>
                          )}

                          <div className="relative overflow-hidden rounded-[24px] border border-white/60 bg-white/35 shadow-sm">
                            {doctor.image ? (
                              <img
                                src={doctor.image}
                                alt={doctor.name}
                                className={`h-[150px] w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
                                  available ? "" : "opacity-80 grayscale-[0.1]"
                                }`}
                              />
                            ) : (
                              <div className="flex h-[150px] items-center justify-center bg-white/35 text-[#2563eb]">
                                <Medal className="h-10 w-10" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 text-center">
                          <h3 className="text-lg font-bold text-[#0f172a]">
                            {doctor.name}
                          </h3>
                          <p className="mt-1 text-sm font-medium text-[#2563eb]">
                            {doctor.specialization || "Specialist"}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-center">
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-3 py-2 text-xs font-medium text-[#64748b]">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#2563eb]" />
                            {doctor.experience
                              ? `${doctor.experience} Experience`
                              : "Experienced Specialist"}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-center">
                          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-[#2563eb]">
                            <CalendarDays className="h-3.5 w-3.5" />$
                            {doctor.fee}
                          </div>
                        </div>

                        <div className="mt-5">
                          {available ? (
                            <Link
                              to={`/doctors/${doctor.id}`}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                            >
                              Book Now
                              <ChevronsRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <button
                              disabled
                              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/28 px-4 py-3 text-sm font-semibold text-[#94a3b8]"
                            >
                              <MousePointer2Off className="h-4 w-4" />
                              Not Available
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeDoctors;
