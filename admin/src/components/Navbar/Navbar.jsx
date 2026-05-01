import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  UserPlus,
  Users,
  Calendar,
  Menu,
  X,
  Grid,
  PlusSquare,
  List,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import logoImg from "../../assets/logo.png";
import { useClerk, useAuth, useUser } from "@clerk/clerk-react";

export default function AnimatedNavbar() {
  const [open, setOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navInnerRef = useRef(null);
  const indicatorRef = useRef(null);
  const navRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  const clerk = useClerk?.();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  const moveIndicator = useCallback(() => {
    const container = navInnerRef.current;
    const ind = indicatorRef.current;
    if (!container || !ind) return;

    const active = container.querySelector(".admin-nav-item.active");
    if (!active) {
      ind.style.opacity = "0";
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    const left = activeRect.left - containerRect.left + container.scrollLeft;
    const width = activeRect.width;

    ind.style.transform = `translateX(${left}px)`;
    ind.style.width = `${width}px`;
    ind.style.opacity = "1";
  }, []);

  useLayoutEffect(() => {
    moveIndicator();
    const t = setTimeout(moveIndicator, 120);
    return () => clearTimeout(t);
  }, [location.pathname, moveIndicator]);

  useEffect(() => {
    const container = navInnerRef.current;
    if (!container) return;

    const onScroll = () => moveIndicator();
    container.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => moveIndicator());
    ro.observe(container);
    if (container.parentElement) ro.observe(container.parentElement);

    window.addEventListener("resize", moveIndicator);
    moveIndicator();

    return () => {
      container.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", moveIndicator);
    };
  }, [moveIndicator]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && navRef.current && !navRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    let mounted = true;

    const storeToken = async () => {
      if (!authLoaded || !userLoaded) return;

      if (!isSignedIn) {
        try {
          localStorage.removeItem("clerk_token");
        } catch {}
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
      } catch {}
      navigate("/");
    }
  };

  const navItems = [
    { to: "/h", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
    { to: "/add", label: "Add Doctor", icon: <UserPlus className="h-4 w-4" /> },
    { to: "/list", label: "List Doctors", icon: <Users className="h-4 w-4" /> },
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
      to: "/add-service",
      label: "Add Service",
      icon: <PlusSquare className="h-4 w-4" />,
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
  ];

  return (
    <div
      ref={navRef}
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ${
        showNavbar ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-[0_18px_50px_rgba(30,64,175,0.10)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            {/* Left */}
            <Link to="/" className="flex items-center gap-3 shrink-0 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4fb] shadow-sm">
                <img
                  src={logoImg}
                  alt="Revive logo"
                  className="h-8 w-8 object-contain"
                />
              </div>

              <div className="hidden sm:block min-w-0">
                <h1 className="truncate text-[1.05rem] font-bold tracking-tight text-[#0f172a]">
                  Revive<span className="text-[#2563eb]">+</span>
                </h1>
                <p className="truncate text-[11px] text-[#64748b]">
                  Admin Control
                </p>
              </div>
            </Link>

            {/* Center desktop nav - only on very wide screens */}
            <div className="hidden xl:flex min-w-0 flex-1 justify-center px-4">
              <div className="relative max-w-full overflow-hidden rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-2 py-2">
                <div
                  ref={navInnerRef}
                  className="relative flex max-w-[980px] items-center gap-2 overflow-x-auto whitespace-nowrap scroll-smooth"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  <div
                    ref={indicatorRef}
                    className="pointer-events-none absolute bottom-0 left-0 h-full rounded-full bg-white shadow-sm transition-all duration-300"
                    style={{ width: 0, opacity: 0 }}
                  />

                  {navItems.map((item) => (
                    <CenterNavItem
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden xl:flex items-center gap-2">
                {isSignedIn ? (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-white px-4 py-2 text-sm font-semibold text-[#2563eb] shadow-sm transition hover:bg-[#f8fbff]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={handleOpenSignIn}
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-white px-4 py-2 text-sm font-semibold text-[#2563eb] shadow-sm transition hover:bg-[#f8fbff]"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                )}
              </div>

              {/* Mobile / tablet menu button appears earlier */}
              <button
                className="xl:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe6f7] bg-white text-[#2563eb] shadow-sm"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Tablet shortcut row */}
          <div className="hidden md:flex xl:hidden items-center gap-2 border-t border-[#eef2f7] px-4 py-3 overflow-x-auto">
            {navItems.slice(0, 5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#eff6ff] text-[#2563eb]"
                      : "bg-white text-[#334155] border border-[#dbe6f7]"
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Mobile / tablet menu */}
          {open && (
            <div
              className="border-t border-[#eef2f7] xl:hidden"
              id="mobile-menu"
            >
              <div className="space-y-2 px-4 py-4">
                <div className="grid gap-2">
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

                <div className="pt-3">
                  {isSignedIn ? (
                    <button
                      onClick={() => {
                        handleSignOut();
                        setOpen(false);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                    >
                      <LogIn className="h-4 w-4" />
                      Login
                    </button>
                  )}
                </div>

                <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
                    <p className="text-sm font-semibold text-[#0f172a]">
                      Admin Controls
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-[#64748b]">
                    Access doctors, appointments, services, and dashboard tools.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .admin-nav-item::-webkit-scrollbar,
        [style*="scrollbarWidth"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

function CenterNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `admin-nav-item relative z-10 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
          isActive ? "active text-[#2563eb]" : "text-[#334155] hover:bg-white"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function MobileItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
          isActive
            ? "bg-[#eff6ff] text-[#2563eb]"
            : "text-[#334155] hover:bg-[#f8fbff]"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
