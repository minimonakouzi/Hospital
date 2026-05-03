import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  CalendarDays,
  BriefcaseMedical,
  ClipboardList,
  CalendarClock,
  Building2,
  HeartPulse,
  UserRoundPlus,
  UserCog,
  ChartNoAxesCombined,
  History,
  FileText,
  FlaskConical,
  CreditCard,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/clerk-react";
import logoImg from "../../assets/logo.png";

const navItems = [
  { to: "/h", label: "Dashboard", icon: LayoutDashboard },
  { to: "/add", label: "Add Doctor", icon: UserPlus },
  { to: "/list", label: "List Doctors", icon: Users },
  { to: "/add-nurse", label: "Add Nurse", icon: UserRoundPlus },
  { to: "/list-nurses", label: "List Nurses", icon: HeartPulse },
  { to: "/add-staff", label: "Add Staff", icon: UserCog },
  { to: "/list-staff", label: "List Staff", icon: ShieldCheck },
  {
    to: "/performance",
    label: "Performance",
    icon: ChartNoAxesCombined,
  },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/ward-management", label: "Ward Management", icon: Building2 },
  {
    to: "/service-dashboard",
    label: "Service Dashboard",
    icon: BriefcaseMedical,
  },
  { to: "/list-service", label: "List Services", icon: ClipboardList },
  {
    to: "/service-appointments",
    label: "Service Appointments",
    icon: CalendarClock,
  },
  { to: "/radiology-reports", label: "Radiology Reports", icon: FileText },
  { to: "/lab-reports", label: "Lab Reports", icon: FlaskConical },
  { to: "/patient-billing", label: "Patient Billing", icon: CreditCard },
  { to: "/audit-logs", label: "Audit Logs", icon: History },
];

const SIDEBAR_SCROLL_KEY = "revive-admin-sidebar-scroll";

function SidebarLink({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group flex min-h-[64px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-white text-[#2563eb] shadow-sm"
            : "bg-white/8 text-white/90 hover:bg-white/14 hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
              isActive
                ? "bg-[#eef4ff] text-[#2563eb]"
                : "bg-white/10 text-white/90 group-hover:bg-white/15",
            ].join(" ")}
          >
            <Icon size={18} />
          </span>

          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout({ title, subtitle, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const { user } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  const resolvedTitle = useMemo(() => {
    if (title) return title;
    const current = navItems.find((item) => item.to === location.pathname);
    return current ? current.label : "Admin Panel";
  }, [title, location.pathname]);

  const resolvedSubtitle =
    subtitle || "Manage your hospital operations from one place";

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const saved = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || 0);
    if (Number.isFinite(saved)) nav.scrollTop = saved;

    const saveScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
    };

    nav.addEventListener("scroll", saveScroll, { passive: true });
    return () => nav.removeEventListener("scroll", saveScroll);
  }, []);

  async function handleSignOut() {
    try {
      await clerk.signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      try {
        localStorage.removeItem("clerk_token");
      } catch (err) {
        console.warn("Failed to clear Clerk token", err);
      }
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-[#dbe6f7] bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] text-[#2563eb] shadow-sm"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Revive"
              className="h-10 w-10 rounded-2xl bg-[#eef4fb] object-contain p-1"
            />
            <div className="leading-tight">
              <div className="text-sm font-bold text-[#0f172a]">
                Revive Admin
              </div>
              <div className="text-xs text-[#64748b]">Hospital dashboard</div>
            </div>
          </div>

          <div className="h-11 w-11" />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 h-[100dvh] w-[270px] transform overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#0d1b3d] via-[#1f58d6] to-[#17336f] text-white shadow-[10px_0_35px_rgba(15,23,42,0.18)] transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-white/10 px-5 py-5">
            <div className="flex items-center justify-between">
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
                <div className="text-sm text-white/75">Admin Dashboard</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white/80 hover:bg-white/10 lg:hidden"
            >
              <X size={18} />
            </button>
            </div>
          </div>

          <div className="px-4 pt-4">
            <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck size={16} />
                Admin Controls
              </div>
              <div className="mt-1 text-sm leading-6 text-white/70">
                Access doctors, services, and appointments
              </div>
            </div>
          </div>

          <nav
            ref={navRef}
            className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-4 scroll-smooth [scrollbar-gutter:stable]"
          >
            {navItems.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>

          <div className="shrink-0 border-t border-white/10 p-4">
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
              <div className="text-sm font-semibold text-white">
                {user?.fullName || user?.firstName || "Admin User"}
              </div>
              <div className="mt-1 truncate text-sm text-white/70">
                {user?.primaryEmailAddress?.emailAddress || "Signed in"}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-[#2563eb] shadow-sm transition hover:bg-[#f8fbff]"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[270px]">
        <main className="min-h-screen">
          <div className="hidden border-b border-[#dbe6f7] bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.02)] lg:block">
            <div className="flex items-center justify-between px-8 py-5">
              <div>
                <div className="mb-2 h-1 w-10 rounded-full bg-[#2563eb]" />
                <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
                  {resolvedTitle}
                </h1>
                <p className="mt-1 text-sm text-[#64748b]">
                  {resolvedSubtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-2 pt-4 lg:hidden">
            <div className="mb-2 h-1 w-10 rounded-full bg-[#2563eb]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              {resolvedTitle}
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">{resolvedSubtitle}</p>
          </div>

          <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
