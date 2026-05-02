import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
  Star,
  Stethoscope,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getServiceImage(service) {
  return (
    service?.imageUrl ||
    service?.image ||
    service?.imageSmall ||
    service?.photo ||
    ""
  );
}

function getServiceName(service) {
  return service?.name || service?.title || "Service";
}

function getServiceDescription(service) {
  return (
    service?.shortDescription ||
    service?.description ||
    service?.about ||
    "Professional diagnostic service with reliable testing and patient-friendly care."
  );
}

function getServicePrice(service) {
  return (
    service?.price ?? service?.fees ?? service?.fee ?? service?.amount ?? 0
  );
}

function isServiceAvailable(service) {
  if (typeof service?.available === "boolean") return service.available;

  if (typeof service?.availability === "string") {
    return service.availability.toLowerCase() === "available";
  }

  return service?.availability === "Available" || service?.available === true;
}

export default function ServicePage({ apiBase }) {
  const navigate = useNavigate();
  const API = apiBase || API_BASE;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/services`);
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Failed to fetch services", body);
        setServices([]);
        return;
      }

      const list = Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.services)
          ? body.services
          : Array.isArray(body?.items)
            ? body.items
            : Array.isArray(body)
              ? body
              : [];

      setServices(list);
    } catch (err) {
      console.error("Network error fetching services", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  const normalizedServices = useMemo(() => {
    return services.map((service) => ({
      ...service,
      _serviceId: service?._id || service?.id,
      _name: getServiceName(service),
      _image: getServiceImage(service),
      _description: getServiceDescription(service),
      _price: getServicePrice(service),
      _available: isServiceAvailable(service),
      _requiresPrescription: Boolean(service?.requiresPrescription),
    }));
  }, [services]);

  function handleBook(service) {
    const id = service?._serviceId;
    if (!id) return;
    navigate(`/services/${id}`);
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#eef6ff] pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_48%,#eef6ff_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1380px] px-4 pb-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-white/70 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="grid items-center gap-8 px-6 py-8 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e6fb] bg-white px-4 py-2 text-sm font-medium text-[#2563eb]">
                <Stethoscope className="h-4 w-4" />
                Revive Diagnostic Services
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#0f172a] md:text-5xl">
                Our Diagnostic Services
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-[#64748b]">
                Safe, accurate, and reliable testing with services designed to
                fit the same clean Revive theme across your hospital platform.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-white px-4 py-2 text-sm font-semibold text-[#334155]">
                  <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
                  Trusted medical services
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-white px-4 py-2 text-sm font-semibold text-[#334155]">
                  <Activity className="h-4 w-4 text-[#2563eb]" />
                  Accurate diagnostic support
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#dbe6f7] bg-[#eef4fb] p-5 shadow-inner">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow-sm">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#0f172a]">
                    Service Booking
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Choose from available services and continue to booking.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-[20px] border border-[#dbe6f7] bg-white p-4">
                  <p className="text-sm text-[#64748b]">Total Services</p>
                  <p className="mt-2 text-2xl font-bold text-[#0f172a]">
                    {normalizedServices.length}
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#dbe6f7] bg-white p-4">
                  <p className="text-sm text-[#64748b]">Available Now</p>
                  <p className="mt-2 text-2xl font-bold text-[#0f172a]">
                    {
                      normalizedServices.filter((service) => service._available)
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        {loading ? (
          <div className="rounded-[30px] border border-[#dbe6f7] bg-white/80 px-6 py-14 text-center text-[#64748b] shadow-sm">
            Loading services...
          </div>
        ) : normalizedServices.length === 0 ? (
          <div className="rounded-[30px] border border-[#dbe6f7] bg-white/80 px-6 py-14 text-center text-[#64748b] shadow-sm">
            No services available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {normalizedServices.map((service) => {
              const available = service._available;

              return (
                <article
                  key={service._serviceId}
                  className="overflow-hidden rounded-[30px] border border-white/60 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.11)]"
                >
                  <div className="p-4">
                    <div className="overflow-hidden rounded-[24px] bg-[#f8fbff]">
                      {service._image ? (
                        <img
                          src={service._image}
                          alt={service._name}
                          className="h-[210px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-[210px] items-center justify-center bg-[#eef4fb] text-[#2563eb]">
                          <Stethoscope className="h-12 w-12" />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 text-center">
                      <h3 className="text-lg font-bold text-[#0f172a]">
                        {service._name}
                      </h3>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          available
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {available ? "Available" : "Not Available"}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">
                        ${service._price}
                      </span>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" />
                          Diagnostic
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          service._requiresPrescription
                            ? "bg-blue-50 text-[#2563eb]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {service._requiresPrescription
                          ? "Prescription Required"
                          : "No Prescription Needed"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-[20px] bg-[#f8fbff] p-4">
                      <p className="line-clamp-3 text-sm leading-7 text-[#64748b]">
                        {service._description}
                      </p>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => handleBook(service)}
                        disabled={!available}
                        className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                          available
                            ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                            : "cursor-not-allowed bg-[#eef2f7] text-[#94a3b8]"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {available ? "Book Now" : "Not Available"}
                          {available && <ChevronRight className="h-4 w-4" />}
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
