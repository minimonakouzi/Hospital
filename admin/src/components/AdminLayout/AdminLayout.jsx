import React, { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  CalendarDays,
  BriefcaseMedical,
  PlusSquare,
  ClipboardList,
  CalendarClock,
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
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  {
    to: "/service-dashboard",
    label: "Service Dashboard",
    icon: BriefcaseMedical,
  },
  { to: "/add-service", label: "Add Service", icon: PlusSquare },
  { to: "/list-service", label: "List Services", icon: ClipboardList },
  {
    to: "/service-appointments",
    label: "Service Appointments",
    icon: CalendarClock,
  },
];

function SidebarLink({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-white text-blue-700 shadow-sm"
            : "text-blue-100 hover:bg-white/10 hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
              isActive
                ? "bg-blue-50 text-blue-600"
                : "bg-white/10 text-blue-100 group-hover:bg-white/15",
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

  async function handleSignOut() {
    try {
      await clerk.signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      try {
        localStorage.removeItem("clerk_token");
      } catch {}
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Revive"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">
                Revive Admin
              </div>
              <div className="text-xs text-slate-500">Healthcare Solutions</div>
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
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-white/10 bg-linear-to-b from-slate-900 via-blue-500 to-slate-900 text-white transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="Revive"
                className="h-12 w-12 rounded-2xl bg-white object-cover p-1"
              />
              <div>
                <div className="text-lg font-bold tracking-tight">Revive</div>
                <div className="text-xs text-blue-100/80">Admin Dashboard</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-blue-100 hover:bg-white/10 lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pb-3 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck size={16} />
                Admin Controls
              </div>
              <div className="mt-1 text-xs text-blue-100/75">
                Access doctors, services, and appointments
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {navItems.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 rounded-2xl bg-white/5 p-3">
              <div className="text-sm font-semibold text-white">
                {user?.fullName || user?.firstName || "Admin User"}
              </div>
              <div className="truncate text-xs text-blue-100/75">
                {user?.primaryEmailAddress?.emailAddress || "Signed in"}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="min-h-screen">
          <div className="hidden border-b border-slate-200 bg-white lg:block">
            <div className="flex items-center justify-between px-8 py-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {resolvedTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {resolvedSubtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-2 pt-4 lg:hidden">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {resolvedTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{resolvedSubtitle}</p>
          </div>

          <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
