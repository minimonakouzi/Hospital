import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  BedDouble,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import logo from "../../assets/logo.png";

const navItems = [
  { name: "Dashboard", to: "/nurse/dashboard", icon: LayoutDashboard },
  { name: "Check-in Queue", to: "/nurse/check-ins", icon: ClipboardList },
  { name: "Vitals", to: "/nurse/vitals", icon: Activity },
  { name: "Bookings", to: "/nurse/bookings", icon: CalendarDays },
  { name: "Ward Patients", to: "/nurse/ward-patients", icon: BedDouble },
];

function NurseNavLinks({ onClick }) {
  return (
    <div className="grid gap-2">
      {navItems.map(({ name, to, icon }) => (
        <NavLink
          key={name}
          to={to}
          onClick={onClick}
          end
          className={({ isActive }) =>
            `group flex min-h-[64px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-white text-[#2563eb] shadow-sm"
                : "bg-white/8 text-white/90 hover:bg-white/14 hover:text-white"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-[#eef4ff] text-[#2563eb]"
                    : "bg-white/10 text-white/90 group-hover:bg-white/15"
                }`}
              >
                {React.createElement(icon, { className: "h-5 w-5" })}
              </span>
              <span className="truncate">{name}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export default function Navbar({ nurse }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("nurseToken_v1");
    localStorage.removeItem("nurseInfo_v1");
    navigate("/nurse/login");
  }

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
              <p className="text-sm font-bold text-[#0f172a]">Revive Nurse</p>
              <p className="text-xs text-[#64748b]">
                {nurse?.department || "Care dashboard"}
              </p>
            </div>
          </div>

          <div className="h-11 w-11" />
        </div>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-[100dvh] w-[270px] transform overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#0d1b3d] via-[#1f58d6] to-[#17336f] text-white shadow-[10px_0_35px_rgba(15,23,42,0.18)] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-white/10 px-5 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-md">
                  <img
                    src={logo}
                    alt="Revive"
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-[1.05rem] font-bold tracking-tight text-white">
                    Revive
                  </h1>
                  <p className="text-sm text-white/75">Nurse Portal</p>
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

          <div className="shrink-0 px-4 pt-4">
            <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-white/90" />
                <p className="text-sm font-semibold text-white">Nurse Access</p>
              </div>
              <p className="text-sm leading-6 text-white/70">
                Read-only workspace for daily care review.
              </p>
            </div>
          </div>

          <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-gutter:stable]">
            <NurseNavLinks onClick={() => setMobileOpen(false)} />
          </nav>

          <div className="shrink-0 border-t border-white/10 p-4">
            <NavLink
              to="/nurse/profile"
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
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      isActive ? "bg-[#eef4ff]" : "bg-white/10"
                    }`}
                  >
                    <UserRoundCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {nurse?.name || "Nurse"}
                    </p>
                    <p className="mt-1 truncate text-xs opacity-70">
                      {nurse?.shift || "Shift"} shift
                    </p>
                  </div>
                </div>
              )}
            </NavLink>

            <button
              type="button"
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
