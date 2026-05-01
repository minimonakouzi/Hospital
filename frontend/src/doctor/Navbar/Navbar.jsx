import React, { useMemo } from "react";
import { NavLink, useParams, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  SquarePen,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import logo from "../../assets/logo.png";

export default function Navbar() {
  const params = useParams();
  const location = useLocation();

  const doctorId = useMemo(() => {
    if (params?.id) return params.id;
    const m = location.pathname.match(/\/doctor-admin\/([^/]+)/);
    if (m) return m[1];
    return null;
  }, [params, location.pathname]);

  const basePath = doctorId
    ? `/doctor-admin/${doctorId}`
    : "/doctor-admin/login";

  const navItems = [
    { name: "Dashboard", to: `${basePath}`, Icon: LayoutDashboard, end: true },
    {
      name: "Appointments",
      to: `${basePath}/appointments`,
      Icon: CalendarDays,
      end: false,
    },
    {
      name: "Edit Profile",
      to: `${basePath}/profile/edit`,
      Icon: SquarePen,
      end: false,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("doctorToken_v1");
    window.location.href = "/doctor-admin/login";
  };

  return (
    <aside className="h-screen w-[270px] overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#0d1b3d] via-[#1f58d6] to-[#17336f] text-white shadow-[10px_0_35px_rgba(15,23,42,0.18)]">
      <div className="flex h-full flex-col">
        {/* Top brand */}
        <div className="border-b border-white/10 px-5 py-5">
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
        <nav className="mt-5 flex-1 px-4">
          <div className="space-y-3">
            {navItems.map(({ name, to, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-3xl px-4 py-4 text-[15px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#2563eb] shadow-[0_8px_24px_rgba(255,255,255,0.2)]"
                      : "bg-white/8 text-white/92 hover:bg-white/14"
                  }`
                }
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    location.pathname === to ||
                    (end === false && location.pathname.startsWith(to))
                      ? "bg-[#eef4ff]"
                      : "bg-white/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-4 pb-4">
          <div className="mb-3 rounded-3xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
            <p className="text-[15px] font-semibold text-white">Doctor Panel</p>
            <p className="mt-1 text-sm text-white/70">Manage your account</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 rounded-3xl bg-white px-4 py-4 text-[15px] font-semibold text-[#2563eb] shadow-sm transition hover:bg-[#f8fbff]"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
