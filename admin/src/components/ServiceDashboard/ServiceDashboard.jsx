import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  RefreshCw,
  X as CloseIcon,
  Activity,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

/* -----------------------
   Normalizer - robust to multiple backend shapes
   ----------------------- */
function normalizeService(doc) {
  if (!doc) return null;

  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name = doc.name || doc.title || doc.serviceName || "Untitled Service";
  const price =
    Number(doc.price ?? doc.fee ?? doc.fees ?? doc.cost ?? doc.amount) || 0;

  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const totalAppointments =
    doc.totalAppointments ??
    doc.appointments?.total ??
    doc.count ??
    doc.stats?.total ??
    doc.bookings ??
    0;

  const completed =
    doc.completed ??
    doc.appointments?.completed ??
    doc.stats?.completed ??
    doc.completedAppointments ??
    0;

  const canceled =
    doc.canceled ??
    doc.appointments?.canceled ??
    doc.stats?.canceled ??
    doc.canceledAppointments ??
    0;

  return {
    id,
    name,
    price,
    image,
    totalAppointments: Number(totalAppointments) || 0,
    completed: Number(completed) || 0,
    canceled: Number(canceled) || 0,
    raw: doc,
  };
}

function formatCurrency(v) {
  return `$${Number(v || 0).toLocaleString()}`;
}

function MetricCard({ icon, label, value, iconWrapClass = "" }) {
  return (
    <div className="rounded-[26px] border border-blue-100 bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

function ServiceAvatar({ service }) {
  if (service.image) {
    return (
      <img
        src={service.image}
        alt={service.name}
        className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">
      {String(service.name || "S")
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}

/* -----------------------
   Main component
   ----------------------- */
export default function ServiceDashboard({ services: servicesProp = null }) {
  const [services, setServices] = useState(
    Array.isArray(servicesProp) ? servicesProp.map(normalizeService) : [],
  );
  const [loading, setLoading] = useState(!Array.isArray(servicesProp));
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const pollHandleRef = useRef(null);

  function buildFetchOptions() {
    const opts = {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const token = localStorage.getItem("authToken");
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    return opts;
  }

  async function fetchServices({ showLoading = true } = {}) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      const url = `${API_BASE}/api/service-appointments/stats/summary`;
      const res = await fetch(url, buildFetchOptions());

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || `Failed to fetch services (${res.status})`,
        );
      }

      const body = await res.json();

      let list = [];
      if (Array.isArray(body)) list = body;
      else if (Array.isArray(body.services)) list = body.services;
      else if (Array.isArray(body.data)) list = body.data;
      else if (Array.isArray(body.items)) list = body.items;
      else {
        const maybeArray = Object.values(body).find((v) => Array.isArray(v));
        if (maybeArray) list = maybeArray;
      }

      const normalized = (list || []).map(normalizeService).filter(Boolean);

      if (mountedRef.current) {
        setServices(normalized);
        setError(null);
      }
    } catch (err) {
      console.error("Service fetch error:", err);
      if (mountedRef.current) {
        setError(err.message || "Failed to load services");
      }
    } finally {
      if (mountedRef.current && showLoading) setLoading(false);
      fetchingRef.current = false;
    }
  }

  useEffect(() => {
    window.refreshServices = () => fetchServices({ showLoading: true });

    return () => {
      try {
        delete window.refreshServices;
      } catch {}
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (Array.isArray(servicesProp)) {
      setServices(servicesProp.map(normalizeService));
      setLoading(false);

      return () => {
        mountedRef.current = false;
      };
    }

    fetchServices({ showLoading: true });

    function startPolling() {
      if (pollHandleRef.current) return;

      pollHandleRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchServices({ showLoading: false });
        }
      }, 10000);
    }

    function stopPolling() {
      if (pollHandleRef.current) {
        clearInterval(pollHandleRef.current);
        pollHandleRef.current = null;
      }
    }

    startPolling();

    function onFocus() {
      fetchServices({ showLoading: false });
    }

    function onServicesUpdated() {
      fetchServices({ showLoading: false });
    }

    function onStorage(e) {
      if (e?.key === "service_bookings_updated") {
        fetchServices({ showLoading: false });
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchServices({ showLoading: false });
      }
    }

    window.addEventListener("focus", onFocus);
    window.addEventListener("services:updated", onServicesUpdated);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mountedRef.current = false;
      stopPolling();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("services:updated", onServicesUpdated);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [servicesProp]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return services;

    const qNum = Number(q);

    return services.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      if (!Number.isNaN(qNum) && s.price <= qNum) return true;
      if (s.price.toString().includes(q)) return true;
      return false;
    });
  }, [services, searchQuery]);

  const INITIAL_COUNT = 8;
  const visibleServices = showAll
    ? filteredServices
    : filteredServices.slice(0, INITIAL_COUNT);

  const totals = useMemo(() => {
    return filteredServices.reduce(
      (acc, s) => {
        acc.totalServices += 1;
        acc.totalAppointments += s.totalAppointments;
        acc.totalCompleted += s.completed;
        acc.totalCanceled += s.canceled;
        acc.totalEarning += s.completed * s.price;
        return acc;
      },
      {
        totalServices: 0,
        totalAppointments: 0,
        totalCompleted: 0,
        totalCanceled: 0,
        totalEarning: 0,
      },
    );
  }, [filteredServices]);

  const metrics = [
    {
      label: "Total Services",
      value: totals.totalServices,
      icon: <ClipboardList className="h-6 w-6 text-blue-600" />,
      iconWrapClass: "bg-blue-50",
    },
    {
      label: "Appointments",
      value: totals.totalAppointments,
      icon: <Calendar className="h-6 w-6 text-violet-600" />,
      iconWrapClass: "bg-violet-50",
    },
    {
      label: "Total Earnings",
      value: formatCurrency(totals.totalEarning),
      icon: <DollarSign className="h-6 w-6 text-emerald-600" />,
      iconWrapClass: "bg-emerald-50",
    },
    {
      label: "Completed",
      value: totals.totalCompleted,
      icon: <CheckCircle className="h-6 w-6 text-cyan-600" />,
      iconWrapClass: "bg-cyan-50",
    },
    {
      label: "Canceled",
      value: totals.totalCanceled,
      icon: <XCircle className="h-6 w-6 text-rose-600" />,
      iconWrapClass: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-7">
      <section className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-sky-50 to-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Key Metrics
            </h2>
            <p className="text-sm text-slate-500">
              Live overview of service dashboard statistics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
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

      <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[1.75rem] font-bold tracking-tight text-slate-900">
              Services Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage and monitor service dashboard records
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-[320px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-11 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <CloseIcon size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (Array.isArray(servicesProp)) return;
                fetchServices({ showLoading: true });
              }}
              disabled={Array.isArray(servicesProp)}
              title={
                Array.isArray(servicesProp)
                  ? "Services provided by parent component"
                  : "Refresh"
              }
              className={`h-11 rounded-2xl border px-5 text-sm font-medium transition ${
                Array.isArray(servicesProp)
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                  : "border-blue-100 bg-slate-50 text-slate-700 hover:bg-blue-50"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-slate-100 px-6 py-4 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        <div className="hidden lg:block">
          <div className="grid grid-cols-12 border-b border-slate-100 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            <div className="col-span-4">Service</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Appointments</div>
            <div className="col-span-2 text-cyan-600">Completed</div>
            <div className="col-span-1 text-rose-500">Canceled</div>
            <div className="col-span-1 text-right">Earnings</div>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-sm text-slate-500">Loading...</div>
          ) : visibleServices.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No services found.
            </div>
          ) : (
            visibleServices.map((service) => (
              <div
                key={service.id}
                className="grid grid-cols-12 items-center border-b border-slate-100 px-6 py-5 transition hover:bg-blue-50/40"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                    <ServiceAvatar service={service} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-slate-900">
                      {service.name}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-[15px] font-semibold text-slate-700">
                  {formatCurrency(service.price)}
                </div>

                <div className="col-span-2 text-[15px] font-semibold text-slate-900">
                  {service.totalAppointments}
                </div>

                <div className="col-span-2 text-[15px] font-semibold text-cyan-600">
                  {service.completed}
                </div>

                <div className="col-span-1 text-[15px] font-semibold text-rose-500">
                  {service.canceled}
                </div>

                <div className="col-span-1 text-right text-[15px] font-bold text-emerald-600">
                  {formatCurrency(service.completed * service.price)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 p-4 lg:hidden">
          {loading ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-6 text-center text-sm text-slate-500">
              Loading...
            </div>
          ) : visibleServices.length === 0 ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-6 text-center text-sm text-slate-500">
              No services found.
            </div>
          ) : (
            visibleServices.map((service) => (
              <div
                key={service.id}
                className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                    <ServiceAvatar service={service} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-slate-900">
                      {service.name}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-600">
                      {formatCurrency(service.price)}
                    </div>
                  </div>

                  <div className="text-right text-sm font-bold text-emerald-600">
                    {formatCurrency(service.completed * service.price)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Appts
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {service.totalAppointments}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Done
                    </div>
                    <div className="mt-1 font-semibold text-cyan-600">
                      {service.completed}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Cancel
                    </div>
                    <div className="mt-1 font-semibold text-rose-600">
                      {service.canceled}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && filteredServices.length > INITIAL_COUNT ? (
          <div className="border-t border-slate-100 px-6 py-5 text-center">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="rounded-2xl border border-blue-100 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50"
            >
              {showAll ? "Show less" : `Show all (${filteredServices.length})`}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
