import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useParams, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  SquarePen,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import logo from "../../assets/logo.png";

const API_BASE = "http://localhost:4000/api/doctors";
const doctorSummaryCache = new Map();

function normalizeDoctorSummary(raw) {
  const doctor = raw?.data || raw?.doctor || raw || {};
  return {
    name: doctor?.name || "Doctor",
    specialty:
      doctor?.specialization ||
      doctor?.speciality ||
      doctor?.role ||
      "Doctor",
  };
}

export default function Navbar() {
  const params = useParams();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const doctorId = useMemo(() => {
    if (params?.id) return params.id;
    const m = location.pathname.match(/\/doctor-admin\/([^/]+)/);
    if (m) return m[1];
    return null;
  }, [params, location.pathname]);

  const basePath = doctorId
    ? `/doctor-admin/${doctorId}`
    : "/doctor-admin/login";
  const profilePath = doctorId ? `${basePath}/profile/edit` : basePath;

  const [doctorSummary, setDoctorSummary] = useState(() =>
    doctorId ? doctorSummaryCache.get(doctorId) || null : null,
  );

  useEffect(() => {
    if (!doctorId) {
      setDoctorSummary(null);
      return;
    }

    const cached = doctorSummaryCache.get(doctorId);
    if (cached) {
      setDoctorSummary(cached);
      return;
    }

    let cancelled = false;

    async function loadDoctorSummary() {
      try {
        const res = await fetch(`${API_BASE}/${doctorId}`);
        const body = await res.json().catch(() => null);
        if (!res.ok) return;

        const nextSummary = normalizeDoctorSummary(body);
        doctorSummaryCache.set(doctorId, nextSummary);
        if (!cancelled) setDoctorSummary(nextSummary);
      } catch (err) {
        console.error("load doctor sidebar profile error:", err);
      }
    }

    setDoctorSummary(null);
    loadDoctorSummary();

    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const navItems = [
    { name: "Dashboard", to: `${basePath}`, icon: LayoutDashboard, end: true },
    {
      name: "Appointments",
      to: `${basePath}/appointments`,
      icon: CalendarDays,
      end: false,
    },
    {
      name: "Schedule Calendar",
      to: `${basePath}/schedule-calendar`,
      icon: CalendarClock,
      end: false,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("doctorToken_v1");
    window.location.href = "/doctor-admin/login";
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-[#dbe6f7] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] text-[#2563eb]"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Revive"
              className="h-10 w-10 rounded-2xl bg-[#eef4fb] object-contain p-1"
            />
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Revive Doctor</p>
              <p className="text-xs text-[#64748b]">Care dashboard</p>
            </div>
          </div>

          <div className="h-11 w-11" />
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-[100dvh] w-[270px] transform overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#0d1b3d] via-[#1f58d6] to-[#17336f] text-white shadow-[10px_0_35px_rgba(15,23,42,0.18)] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Top brand */}
          <div className="shrink-0 border-b border-white/10 px-5 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-md">
                  <img
                    src={logo}
                    alt="Revive logo"
                    className="h-10 w-10 object-contain"
                  />
                </div>

                <div>
                  <h1 className="text-[1.05rem] font-bold tracking-tight text-white">
                    Revive
                  </h1>
                  <p className="text-sm text-white/75">Doctor Dashboard</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl p-2 text-white/80 hover:bg-white/10 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Small info card */}
          <div className="px-4 pt-4">
            <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-white/90" />
                <p className="text-sm font-semibold text-white">
                  Doctor Controls
                </p>
              </div>
              <p className="text-sm leading-6 text-white/70">
                Access your appointments and manage your profile.
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-gutter:stable]">
            <div className="space-y-2">
              {navItems.map(({ name, to, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `group flex min-h-[64px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white text-[#2563eb] shadow-sm"
                        : "bg-white/8 text-white/90 hover:bg-white/14 hover:text-white"
                    }`
                  }
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
                      location.pathname === to ||
                      (end === false && location.pathname.startsWith(to))
                        ? "bg-[#eef4ff] text-[#2563eb]"
                        : "bg-white/10 text-white/90 group-hover:bg-white/15"
                    }`}
                  >
                    {React.createElement(Icon, { className: "h-5 w-5" })}
                  </span>
                  <span>{name}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Bottom */}
          <div className="shrink-0 border-t border-white/10 p-4">
            <NavLink
              to={profilePath}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `mb-3 flex min-h-[68px] w-full rounded-2xl border px-4 py-3 backdrop-blur-sm transition-all duration-200 ${
                  isActive
                    ? "border-white/30 bg-white text-[#2563eb]"
                    : "border-white/10 bg-white/10 text-white hover:bg-white/15"
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      isActive ? "bg-[#eef4ff]" : "bg-white/10"
                    }`}
                  >
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {doctorSummary?.name || "Doctor"}
                    </p>
                    <p className="mt-1 truncate text-xs opacity-70">
                      {doctorSummary?.specialty || "Doctor"}
                    </p>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      isActive ? "bg-[#eef4ff]" : "bg-white/10"
                    }`}
                  >
                    <SquarePen className="h-4 w-4" />
                  </div>
                </div>
              )}
            </NavLink>

            <button
              onClick={handleLogout}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-[#2563eb] shadow-sm transition hover:bg-[#f8fbff]"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
