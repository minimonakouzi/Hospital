import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChartNoAxesCombined,
  ChevronDown,
  Grid,
  HeartPulse,
  History,
  Home,
  List,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
  UserPlus,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import logoImg from "../../assets/logo.png";
import { useClerk, useAuth, useUser } from "@clerk/clerk-react";

const navItems = [
  { to: "/h", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  { to: "/add", label: "Add Doctor", icon: <UserPlus className="h-4 w-4" /> },
  { to: "/list", label: "List Doctors", icon: <Users className="h-4 w-4" /> },
  {
    to: "/add-nurse",
    label: "Add Nurse",
    icon: <UserRoundPlus className="h-4 w-4" />,
  },
  {
    to: "/list-nurses",
    label: "List Nurses",
    icon: <HeartPulse className="h-4 w-4" />,
  },
  {
    to: "/add-staff",
    label: "Add Staff",
    icon: <UserCog className="h-4 w-4" />,
  },
  {
    to: "/list-staff",
    label: "List Staff",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    to: "/performance",
    label: "Performance",
    icon: <ChartNoAxesCombined className="h-4 w-4" />,
  },
  {
    to: "/appointments",
    label: "Appointments",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    to: "/service-dashboard",
    label: "Service Dashboard",
    icon: <Grid className="h-4 w-4" />,
  },
  {
    to: "/list-service",
    label: "List Services",
    icon: <List className="h-4 w-4" />,
  },
  {
    to: "/service-appointments",
    label: "Service Appointments",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    to: "/audit-logs",
    label: "Audit Logs",
    icon: <History className="h-4 w-4" />,
  },
];

const getItem = (path) => navItems.find((item) => item.to === path);

const navGroups = [
  { type: "link", ...getItem("/h") },
  {
    type: "menu",
    label: "People",
    icon: <Users className="h-4 w-4" />,
    columns: 2,
    items: [
      getItem("/add"),
      getItem("/list"),
      getItem("/add-nurse"),
      getItem("/list-nurses"),
      getItem("/add-staff"),
      getItem("/list-staff"),
    ],
  },
  { type: "link", ...getItem("/performance") },
  { type: "link", ...getItem("/appointments") },
  {
    type: "menu",
    label: "Services",
    icon: <Grid className="h-4 w-4" />,
    columns: 1,
    items: [
      getItem("/service-dashboard"),
      getItem("/list-service"),
      getItem("/service-appointments"),
    ],
  },
  { type: "link", ...getItem("/audit-logs") },
];

export default function AnimatedNavbar() {
  const [open, setOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);

  const navRef = useRef(null);
  const lastScrollY = useRef(0);

  const location = useLocation();
  const navigate = useNavigate();

  const clerk = useClerk?.();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpen(false);
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setOpen(false);
    setActiveMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const storeToken = async () => {
      if (!authLoaded || !userLoaded) return;

      if (!isSignedIn) {
        try {
          localStorage.removeItem("clerk_token");
        } catch (err) {
          console.warn("Failed to clear Clerk token", err);
        }
        return;
      }

      try {
        if (getToken) {
          const token = await getToken();
          if (!mounted) return;

          if (token) {
            try {
              localStorage.setItem("clerk_token", token);
            } catch (e) {
              console.warn("Failed to write clerk token to localStorage", e);
            }
          }
        }
      } catch (err) {
        console.warn("Could not retrieve Clerk token:", err);
      }
    };

    storeToken();
    return () => {
      mounted = false;
    };
  }, [isSignedIn, authLoaded, userLoaded, getToken]);

  const handleOpenSignIn = () => {
    if (!clerk || !clerk.openSignIn) {
      console.warn("Clerk is not available to open sign-in.");
      return;
    }
    clerk.openSignIn();
    navigate("/h");
  };

  const handleSignOut = async () => {
    if (!clerk || !clerk.signOut) {
      console.warn("Clerk signOut not available.");
      return;
    }

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
  };

  const isRouteActive = (to) => location.pathname === to;
  const isGroupActive = (group) =>
    group.type === "link"
      ? isRouteActive(group.to)
      : group.items.some((item) => item && isRouteActive(item.to));

  return (
    <div
      ref={navRef}
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ${
        showNavbar ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto max-w-[1240px] px-3 pt-3 sm:px-6 lg:px-8">
        <div className="overflow-visible rounded-[22px] border border-white/16 bg-[#061226]/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_44px_rgba(2,8,23,0.20)] backdrop-blur-[12px]">
          <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
            <Link
              to="/"
              className="flex min-w-[210px] shrink-0 items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[17px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(226,241,255,0.90))] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_10px_24px_rgba(2,8,23,0.20)]">
                <img
                  src={logoImg}
                  alt="Revive logo"
                  className="h-8 w-8 object-contain"
                />
              </div>

              <div className="hidden min-w-0 sm:block">
                <h1 className="truncate text-[14px] font-bold leading-5 text-white">
                  Revive Admin
                </h1>
                <p className="truncate text-[11px] font-semibold leading-4 text-blue-100/64">
                  Hospital control center
                </p>
              </div>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
              {navGroups.map((group) =>
                group.type === "link" ? (
                  <DesktopLink
                    key={group.to}
                    item={group}
                    isActive={isGroupActive(group)}
                  />
                ) : (
                  <DesktopMenu
                    key={group.label}
                    group={group}
                    isActive={isGroupActive(group)}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                  />
                )
              )}
            </nav>

            <div className="flex min-w-[104px] shrink-0 items-center justify-end gap-2">
              <div className="hidden xl:block">
                {isSignedIn ? (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/18 bg-white/[0.08] px-4 text-[13.5px] font-bold text-blue-50 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={handleOpenSignIn}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f8fbff,#dbeafe)] px-4 text-[13.5px] font-bold text-[#12356f] shadow-[0_12px_26px_rgba(2,8,23,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(2,8,23,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                )}
              </div>

              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/[0.08] text-blue-50 shadow-sm transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226] xl:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {open && (
            <div className="border-t border-white/12 bg-[#061226]/72 xl:hidden" id="mobile-menu">
              <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                {navItems.map((item) => (
                  <MobileItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </div>

              <div className="border-t border-white/12 px-3 py-3">
                {isSignedIn ? (
                  <button
                    onClick={() => {
                      handleSignOut();
                      setOpen(false);
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f8fbff,#dbeafe)] px-4 text-[13.5px] font-bold text-[#12356f] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleOpenSignIn();
                      setOpen(false);
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f8fbff,#dbeafe)] px-4 text-[13.5px] font-bold text-[#12356f] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopLink({ item, isActive }) {
  return (
    <NavLink
      to={item.to}
      end
      className={[
        "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]",
        isActive
          ? "bg-white/[0.14] text-white shadow-[0_8px_22px_rgba(2,8,23,0.16)]"
          : "text-blue-50/78 hover:bg-white/[0.10] hover:text-white",
      ].join(" ")}
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );
}

function DesktopMenu({ group, isActive, activeMenu, setActiveMenu }) {
  const menuOpen = activeMenu === group.label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setActiveMenu(menuOpen ? null : group.label)}
        className={[
          "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]",
          isActive || menuOpen
            ? "bg-white/[0.14] text-white shadow-[0_8px_22px_rgba(2,8,23,0.16)]"
            : "text-blue-50/78 hover:bg-white/[0.10] hover:text-white",
        ].join(" ")}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        {group.icon}
        <span>{group.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      {menuOpen && (
        <div
          className={[
            "absolute left-1/2 top-12 z-50 -translate-x-1/2 rounded-[18px] border border-white/14 bg-[#061226]/82 p-3 shadow-[0_20px_52px_rgba(2,8,23,0.28)] backdrop-blur-[12px]",
            group.columns === 2 ? "w-[420px]" : "w-56",
          ].join(" ")}
          role="menu"
        >
          <div
            className={[
              "grid gap-1.5",
              group.columns === 2 ? "grid-cols-2" : "grid-cols-1",
            ].join(" ")}
          >
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive: itemActive }) =>
                  [
                    "flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-[13.5px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]",
                    itemActive
                      ? "bg-white/[0.13] text-white shadow-sm"
                      : "text-blue-50/76 hover:bg-white/[0.10] hover:text-white hover:shadow-sm",
                  ].join(" ")
                }
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[13px] border border-sky-200/16 bg-sky-200/[0.10] text-sky-100">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-[16px] px-3 py-3 text-[13.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]",
          isActive
            ? "bg-white/[0.13] text-white"
            : "text-blue-50/78 hover:bg-white/[0.10] hover:text-white",
        ].join(" ")
      }
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-sky-200/16 bg-sky-200/[0.10] text-sky-100">
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}
