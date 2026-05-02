import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseMedical,
  CalendarCheck,
  LogOut,
  Menu,
  PlusSquare,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import logoImg from "../../assets/logo.png";

const API_BASE = "http://localhost:4000";
const STAFF_TOKEN_KEY = "staffToken_v1";
const STAFF_INFO_KEY = "staffInfo_v1";

const navItems = [
  { to: "/staff/services", label: "Services", icon: BriefcaseMedical },
  {
    to: "/staff/service-appointments",
    label: "Appointments",
    icon: CalendarCheck,
  },
  { to: "/staff/add-service", label: "Add Service", icon: PlusSquare },
];

export function StaffPageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div className="border-b border-[#dbe6f7] bg-white/95 px-4 py-5 shadow-[0_1px_0_rgba(15,23,42,0.02)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {breadcrumb || `Staff Portal / ${title}`}
          </p>
          <div className="mb-2 h-1 w-10 rounded-full bg-[#2563eb]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.7rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
    </div>
  );
}

function StaffLink({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex min-h-[64px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-white text-[#2563eb] shadow-sm"
            : "bg-white/8 text-white/90 hover:bg-white/14 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
              isActive
                ? "bg-[#eef4ff] text-[#2563eb]"
                : "bg-white/10 text-white/90 group-hover:bg-white/15"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function StaffWorkspaceState({ type, message, onRetry }) {
  const isError = type === "error";
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isError ? "bg-rose-50 text-rose-600" : "bg-[#eef4fb] text-[#2563eb]"
              }`}
            >
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-bold ${
                  isError ? "text-rose-700" : "text-[#2563eb]"
                }`}
              >
                {message}
              </p>
              {!isError ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : null}
            </div>
            {isError ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Try Again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffLayout() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const logout = useCallback(() => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STAFF_INFO_KEY);
    navigate("/staff/login", { replace: true });
  }, [navigate]);

  const loadStaff = useCallback(async () => {
    const token = localStorage.getItem(STAFF_TOKEN_KEY);
    if (!token) {
      logout();
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/staff/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout();
          return;
        }
        throw new Error(body?.message || "Unable to load staff profile.");
      }

      const nextStaff = body?.data || null;
      setStaff(nextStaff);
      localStorage.setItem(STAFF_INFO_KEY, JSON.stringify(nextStaff || {}));
    } catch (err) {
      console.error("load staff profile error:", err);
      setError(err?.message || "Unable to load staff profile.");
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(STAFF_INFO_KEY) || "null");
      if (cached?.name) setStaff(cached);
    } catch {
      localStorage.removeItem(STAFF_INFO_KEY);
    }
    loadStaff();
  }, [loadStaff]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <style>
        {`@keyframes staffFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-blue-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Revive" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-bold text-slate-900">Revive Staff</p>
              <p className="text-xs text-slate-500">Service Management</p>
            </div>
          </div>
          <div className="h-11 w-11" />
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-[270px] transform overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#0d1b3d] via-[#1f58d6] to-[#17336f] text-white shadow-[10px_0_35px_rgba(15,23,42,0.18)] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-md">
                <img
                  src={logoImg}
                  alt="Revive"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div>
                <div className="text-[1.05rem] font-bold tracking-tight">
                  Revive
                </div>
                <div className="text-sm text-white/75">Staff Portal</div>
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

          <div className="px-4 pt-4">
            <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-white/90" />
                <p className="text-sm font-semibold text-white">Staff Controls</p>
              </div>
              <p className="text-sm leading-6 text-white/70">
                Manage hospital services and appointments.
              </p>
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-2 overflow-y-auto px-4 pb-4 [scrollbar-gutter:stable]">
            {navItems.map((item) => (
              <StaffLink
                key={item.to}
                item={item}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <NavLink
              to="/staff/profile"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `mb-3 flex min-h-[68px] rounded-2xl border px-4 py-3 transition ${
                  isActive
                    ? "border-white/30 bg-white text-[#2563eb]"
                    : "border-white/10 bg-white/8 text-white hover:bg-white/14"
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      isActive ? "bg-[#eef4ff]" : "bg-white/10"
                    }`}
                  >
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {staff?.name || "Staff"}
                    </div>
                    <div className="mt-1 truncate text-xs opacity-70">
                      {staff?.department || "Services"}
                    </div>
                  </div>
                </div>
              )}
            </NavLink>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#2563eb] shadow-sm transition hover:bg-[#f8fbff]"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[270px]">
        <main className="min-h-screen bg-[#f8fafc]">
          {loading ? (
            <>
              <StaffPageHeader
                title="Staff Workspace"
                subtitle="Preparing your service management dashboard."
              />
              <StaffWorkspaceState
                type="loading"
                message="Loading staff workspace..."
              />
            </>
          ) : error ? (
            <>
              <StaffPageHeader
                title="Staff Workspace"
                subtitle="The dashboard shell is ready, but your profile could not be loaded."
              />
              <StaffWorkspaceState
                type="error"
                message={error}
                onRetry={loadStaff}
              />
            </>
          ) : (
            <div
              key={location.pathname}
              style={{ animation: "staffFadeIn 180ms ease-out" }}
            >
              <Outlet context={{ staff, refreshStaff: loadStaff }} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
