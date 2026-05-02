"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import {
  Menu,
  X,
  LayoutGrid,
  Stethoscope,
  FlaskConical,
  CalendarDays,
  FileHeart,
  ClipboardList,
  Phone,
  ShieldCheck,
  LogIn,
  HeartPulse,
  BedDouble,
  Bell,
  MessageSquareText,
  FileText,
  CreditCard,
} from "lucide-react";

// Clerk
import { SignedIn, SignedOut, useAuth, useClerk } from "@clerk/clerk-react";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api`;

/* ================= ANIMATED LOGOUT BUTTON ================= */
function AnimatedLogoutButton({ onLogout }) {
  const [state, setState] = useState("default");
  const [clicked, setClicked] = useState(false);
  const [doorSlammed, setDoorSlammed] = useState(false);
  const [falling, setFalling] = useState(false);
  const [text, setText] = useState("Log Out");
  const [fallMetrics, setFallMetrics] = useState({
    left: 0,
    top: 0,
    distance: 0,
  });

  const timers = useRef([]);
  const buttonRef = useRef(null);
  const figureRef = useRef(null);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const logoutButtonStates = {
    default: {
      figureDuration: 100,
      transformFigure: "none",
      walkingDuration: 100,
      transformArm1: "none",
      transformWrist1: "none",
      transformArm2: "none",
      transformWrist2: "none",
      transformLeg1: "none",
      transformCalf1: "none",
      transformLeg2: "none",
      transformCalf2: "none",
    },
    hover: {
      figureDuration: 100,
      transformFigure: "translateX(1.5px)",
      walkingDuration: 100,
      transformArm1: "rotate(-5deg)",
      transformWrist1: "rotate(-15deg)",
      transformArm2: "rotate(5deg)",
      transformWrist2: "rotate(6deg)",
      transformLeg1: "rotate(-10deg)",
      transformCalf1: "rotate(5deg)",
      transformLeg2: "rotate(20deg)",
      transformCalf2: "rotate(-20deg)",
    },
    walking1: {
      figureDuration: 300,
      transformFigure: "translateX(11px)",
      walkingDuration: 300,
      transformArm1: "translateX(-4px) translateY(-2px) rotate(120deg)",
      transformWrist1: "rotate(-5deg)",
      transformArm2: "translateX(4px) rotate(-110deg)",
      transformWrist2: "rotate(-5deg)",
      transformLeg1: "translateX(-3px) rotate(80deg)",
      transformCalf1: "rotate(-30deg)",
      transformLeg2: "translateX(4px) rotate(-60deg)",
      transformCalf2: "rotate(20deg)",
    },
    walking2: {
      figureDuration: 400,
      transformFigure: "translateX(17px)",
      walkingDuration: 300,
      transformArm1: "rotate(60deg)",
      transformWrist1: "rotate(-15deg)",
      transformArm2: "rotate(-45deg)",
      transformWrist2: "rotate(6deg)",
      transformLeg1: "rotate(-5deg)",
      transformCalf1: "rotate(10deg)",
      transformLeg2: "rotate(10deg)",
      transformCalf2: "rotate(-20deg)",
    },
    falling1: {
      figureDuration: 1600,
      transformFigure: "translateX(17px)",
      walkingDuration: 400,
      transformArm1: "rotate(-60deg)",
      transformWrist1: "none",
      transformArm2: "rotate(30deg)",
      transformWrist2: "rotate(120deg)",
      transformLeg1: "rotate(-30deg)",
      transformCalf1: "rotate(-20deg)",
      transformLeg2: "rotate(20deg)",
      transformCalf2: "rotate(-10deg)",
    },
    falling2: {
      figureDuration: 1600,
      transformFigure: "translateX(17px)",
      walkingDuration: 300,
      transformArm1: "rotate(-100deg)",
      transformWrist1: "none",
      transformArm2: "rotate(-60deg)",
      transformWrist2: "rotate(60deg)",
      transformLeg1: "rotate(80deg)",
      transformCalf1: "rotate(20deg)",
      transformLeg2: "rotate(-60deg)",
      transformCalf2: "rotate(10deg)",
    },
    falling3: {
      figureDuration: 1600,
      transformFigure: "translateX(17px)",
      walkingDuration: 500,
      transformArm1: "rotate(-30deg)",
      transformWrist1: "rotate(40deg)",
      transformArm2: "rotate(50deg)",
      transformWrist2: "none",
      transformLeg1: "rotate(-30deg)",
      transformCalf1: "rotate(0deg)",
      transformLeg2: "rotate(20deg)",
      transformCalf2: "none",
    },
  };

  const current = logoutButtonStates[state] || logoutButtonStates.default;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const handleMouseEnter = () => {
    if (!clicked && state === "default") setState("hover");
  };

  const handleMouseLeave = () => {
    if (!clicked && state === "hover") setState("default");
  };

  const prepareFallToPageBottom = () => {
    if (!figureRef.current) return;

    const rect = figureRef.current.getBoundingClientRect();
    const figureHeight = rect.height || 30;
    const bottomGap = 120; // lets him fall clearly below the page view
    const distance = Math.max(
      window.innerHeight - rect.top + bottomGap,
      figureHeight,
    );

    setFallMetrics({
      left: rect.left,
      top: rect.top,
      distance,
    });
  };

  const handleClick = () => {
    if (clicked) return;

    clearTimers();
    setClicked(true);
    setText("Signing out");
    setState("walking1");

    timers.current.push(
      setTimeout(() => {
        setDoorSlammed(true);
        setState("walking2");

        timers.current.push(
          setTimeout(() => {
            prepareFallToPageBottom();
            setFalling(true);
            setText("Stay safe");
            setState("falling1");

            timers.current.push(
              setTimeout(() => {
                setState("falling2");

                timers.current.push(
                  setTimeout(() => {
                    setState("falling3");

                    timers.current.push(
                      setTimeout(async () => {
                        await onLogout?.();
                      }, 1000),
                    );
                  }, logoutButtonStates.falling2.walkingDuration),
                );
              }, logoutButtonStates.falling1.walkingDuration),
            );
          }, logoutButtonStates.walking2.figureDuration),
        );
      }, logoutButtonStates.walking1.figureDuration),
    );
  };

  const fallingFigureStyle = falling
    ? {
        left: `${fallMetrics.left}px`,
        top: `${fallMetrics.top}px`,
        right: "auto",
        bottom: "auto",
        "--fall-distance": `${fallMetrics.distance}px`,
      }
    : {};

  return (
    <>
      <style>{`
        .logoutButton {
          background: none;
          border: 0;
          color: #f4f7ff;
          cursor: pointer;
          display: block;
          font-size: 13px;
          font-weight: 700;
          height: 42px;
          outline: none;
          padding: 0 0 0 18px;
          perspective: 100px;
          position: relative;
          text-align: left;
          width: 150px;
          -webkit-tap-highlight-color: transparent;
        }

        .logoutButton::before {
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,251,255,0.96));
          border: 1px solid rgba(219,230,247,0.95);
          border-radius: 999px;
          box-shadow:
            0 8px 20px rgba(37,99,235,0.08),
            inset 0 1px 0 rgba(255,255,255,0.85);
          content: "";
          display: block;
          height: 100%;
          left: 0;
          position: absolute;
          top: 0;
          transform: none;
          transition: transform 50ms ease;
          width: 100%;
          z-index: 2;
        }

        .logoutButton:hover .door {
          transform: rotateY(20deg);
        }

        .logoutButton:active::before {
          transform: scale(0.96);
        }

        .logoutButton:active .door {
          transform: rotateY(28deg);
        }

        .logoutButton.clicked::before {
          transform: none;
        }

        .logoutButton.clicked .door {
          transform: rotateY(35deg);
        }

        .logoutButton.door-slammed .door {
          transform: none;
          transition: transform 100ms ease-in 250ms;
        }

        .logoutButton.falling {
          animation: shake 200ms linear;
        }

        .logoutButton.falling .bang {
          animation: flash 300ms linear;
        }

        .button-text {
          color: #2563eb;
          font-weight: 700;
          font-size: 13px;
          position: relative;
          z-index: 10;
          white-space: nowrap;
        }

        .figure {
          bottom: 6px;
          fill: #2563eb;
          right: 18px;
          transform: ${current.transformFigure};
          transition: transform ${current.figureDuration}ms cubic-bezier(0.2, 0.1, 0.8, 0.9);
          width: 30px;
          z-index: 4;
          position: absolute;
          display: block;
        }

        .logoutButton.falling .figure {
          position: fixed !important;
          z-index: 9999;
          animation:
            figureDrop 1600ms cubic-bezier(0.22, 0.8, 0.25, 1) forwards,
            spin 900ms linear infinite;
          opacity: 1;
          transition: none;
          pointer-events: none;
        }

        .door,
        .doorway {
          bottom: 5px;
          right: 12px;
          width: 32px;
          position: absolute;
          display: block;
        }

        .door path {
          fill: #2563eb;
          stroke: #2563eb;
          stroke-width: 4;
        }

        .door circle {
          fill: white;
        }

        .door {
          transform: rotateY(20deg);
          transform-origin: 100% 50%;
          transform-style: preserve-3d;
          transition: transform 200ms ease;
          z-index: 5;
        }

        .doorway path:first-child {
          fill: #dbeafe;
        }

        .doorway {
          z-index: 3;
        }

        .bang {
          opacity: 0;
          fill: #93c5fd;
        }

        .arm1, .wrist1, .arm2, .wrist2, .leg1, .calf1, .leg2, .calf2 {
          transition: transform ${current.walkingDuration}ms ease-in-out;
        }

        .arm1 {
          transform: ${current.transformArm1};
          transform-origin: 52% 45%;
        }

        .wrist1 {
          transform: ${current.transformWrist1};
          transform-origin: 59% 55%;
        }

        .arm2 {
          transform: ${current.transformArm2};
          transform-origin: 47% 43%;
        }

        .wrist2 {
          transform: ${current.transformWrist2};
          transform-origin: 35% 47%;
        }

        .leg1 {
          transform: ${current.transformLeg1};
          transform-origin: 47% 64.5%;
        }

        .calf1 {
          transform: ${current.transformCalf1};
          transform-origin: 55.5% 71.5%;
        }

        .leg2 {
          transform: ${current.transformLeg2};
          transform-origin: 43% 63%;
        }

        .calf2 {
          transform: ${current.transformCalf2};
          transform-origin: 41.5% 73%;
        }

        @keyframes spin {
          from {
            rotate: 0deg;
          }
          to {
            rotate: 359deg;
          }
        }

        @keyframes shake {
          0% {
            transform: rotate(-1deg);
          }
          50% {
            transform: rotate(2deg);
          }
          100% {
            transform: rotate(-1deg);
          }
        }

        @keyframes flash {
          0% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes figureDrop {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.94);
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, var(--fall-distance), 0) rotate(760deg) scale(0.94);
            opacity: 0;
          }
        }
      `}</style>

      <button
        ref={buttonRef}
        className={`logoutButton ${clicked ? "clicked" : ""} ${doorSlammed ? "door-slammed" : ""} ${falling ? "falling" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        disabled={clicked}
        type="button"
      >
        <svg className="doorway" viewBox="0 0 100 100">
          <path d="M93.4 86.3H58.6c-1.9 0-3.4-1.5-3.4-3.4V17.1c0-1.9 1.5-3.4 3.4-3.4h34.8c1.9 0 3.4 1.5 3.4 3.4v65.8c0 1.9-1.5 3.4-3.4 3.4z" />
          <path
            className="bang"
            d="M40.5 43.7L26.6 31.4l-2.5 6.7zM41.9 50.4l-19.5-4-1.4 6.3zM40 57.4l-17.7 3.9 3.9 5.7z"
          />
        </svg>

        <svg
          ref={figureRef}
          className="figure"
          style={fallingFigureStyle}
          viewBox="0 0 100 100"
        >
          <circle cx="52.1" cy="32.4" r="6.4" />
          <path d="M50.7 62.8c-1.2 2.5-3.6 5-7.2 4-3.2-.9-4.9-3.5-4-7.8.7-3.4 3.1-13.8 4.1-15.8 1.7-3.4 1.6-4.6 7-3.7 4.3.7 4.6 2.5 4.3 5.4-.4 3.7-2.8 15.1-4.2 17.9z" />

          <g className="arm1">
            <path d="M55.5 56.5l-6-9.5c-1-1.5-.6-3.5.9-4.4 1.5-1 3.7-1.1 4.6.4l6.1 10c1 1.5.3 3.5-1.1 4.4-1.5.9-3.5.5-4.5-.9z" />
            <path
              className="wrist1"
              d="M69.4 59.9L58.1 58c-1.7-.3-2.9-1.9-2.6-3.7.3-1.7 1.9-2.9 3.7-2.6l11.4 1.9c1.7.3 2.9 1.9 2.6 3.7-.4 1.7-2 2.9-3.8 2.6z"
            />
          </g>

          <g className="arm2">
            <path d="M34.2 43.6L45 40.3c1.7-.6 3.5.3 4 2 .6 1.7-.3 4-2 4.5l-10.8 2.8c-1.7.6-3.5-.3-4-2-.6-1.6.3-3.4 2-4z" />
            <path
              className="wrist2"
              d="M27.1 56.2L32 45.7c.7-1.6 2.6-2.3 4.2-1.6 1.6.7 2.3 2.6 1.6 4.2L33 58.8c-.7 1.6-2.6 2.3-4.2 1.6-1.7-.7-2.4-2.6-1.7-4.2z"
            />
          </g>

          <g className="leg1">
            <path d="M52.1 73.2s-7-5.7-7.9-6.5c-.9-.9-1.2-3.5-.1-4.9 1.1-1.4 3.8-1.9 5.2-.9l7.9 7c1.4 1.1 1.7 3.5.7 4.9-1.1 1.4-4.4 1.5-5.8.4z" />
            <path
              className="calf1"
              d="M52.6 84.4l-1-12.8c-.1-1.9 1.5-3.6 3.5-3.7 2-.1 3.7 1.4 3.8 3.4l1 12.8c.1 1.9-1.5 3.6-3.5 3.7-2 0-3.7-1.5-3.8-3.4z"
            />
          </g>

          <g className="leg2">
            <path d="M37.8 72.7s1.3-10.2 1.6-11.4 2.4-2.8 4.1-2.6c1.7.2 3.6 2.3 3.4 4l-1.8 11.1c-.2 1.7-1.7 3.3-3.4 3.1-1.8-.2-4.1-2.4-3.9-4.2z" />
            <path
              className="calf2"
              d="M29.5 82.3l9.6-10.9c1.3-1.4 3.6-1.5 5.1-.1 1.5 1.4.4 4.9-.9 6.3l-8.5 9.6c-1.3 1.4-3.6 1.5-5.1.1-1.4-1.3-1.5-3.5-.2-5z"
            />
          </g>
        </svg>

        <svg className="door" viewBox="0 0 100 100">
          <path d="M93.4 86.3H58.6c-1.9 0-3.4-1.5-3.4-3.4V17.1c0-1.9 1.5-3.4 3.4-3.4h34.8c1.9 0 3.4 1.5 3.4 3.4v65.8c0 1.9-1.5 3.4-3.4 3.4z" />
          <circle cx="66" cy="50" r="3.7" />
        </svg>

        <span className="button-text">{text}</span>
      </button>
    </>
  );
}
/* ===================================================== */

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const location = useLocation();
  const navRef = useRef(null);
  const clerk = useClerk();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      if (!isLoaded || !isSignedIn) {
        setUnreadCount(0);
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE}/patient-notifications/my?status=All&limit=1`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const body = await res.json().catch(() => null);
        if (!res.ok) return;
        if (active) setUnreadCount(Number(body?.unreadCount || 0));
      } catch (err) {
        console.error("load notification badge error:", err);
        if (active) setUnreadCount(0);
      }
    }

    loadUnreadCount();
    window.addEventListener("revive:notifications-updated", loadUnreadCount);

    return () => {
      active = false;
      window.removeEventListener("revive:notifications-updated", loadUnreadCount);
    };
  }, [getToken, isLoaded, isSignedIn, location.pathname]);

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
      if (isOpen && navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const navItems = [
    { label: "Home", href: "/", icon: LayoutGrid },
    { label: "Doctors", href: "/doctors", icon: Stethoscope },
    { label: "Services", href: "/services", icon: FlaskConical },
    { label: "Appointments", href: "/appointments", icon: CalendarDays },
    { label: "Records", href: "/medical-records", icon: FileHeart },
    { label: "Contact", href: "/contact", icon: Phone },
  ];

  const portalItems = [
    { label: "Doctor Admin", href: "/doctor-admin/login", icon: ShieldCheck },
    { label: "Nurse Portal", href: "/nurse/login", icon: HeartPulse },
    {
      label: "Staff Portal",
      href: "http://localhost:5174/staff/login",
      icon: ShieldCheck,
      external: true,
    },
  ];

  const isActive = (href) => location.pathname === href;

  const notificationBadge =
    unreadCount > 0 ? (
      <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    ) : null;

  return (
    <div
      ref={navRef}
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ${
        showNavbar ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto max-w-[1240px] px-3 pt-3 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_14px_38px_rgba(30,64,175,0.10)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
            {/* Left */}
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1 transition hover:bg-[#f8fbff]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4fb] shadow-sm">
                <img
                  src={logo}
                  alt="Revive logo"
                  className="h-7 w-7 object-contain"
                />
              </div>

              <div className="hidden min-w-0 sm:block">
                <h1 className="text-[1rem] font-bold tracking-tight text-[#0f172a]">
                  Revive<span className="text-[#2563eb]">+</span>
                </h1>
                <p className="truncate text-[10px] font-medium text-[#64748b]">
                  Healthcare Solutions
                </p>
              </div>
            </Link>

            {/* Center desktop nav */}
            <nav className="hidden items-center gap-1 rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-1 xl:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold transition ${
                      active
                        ? "bg-white text-[#2563eb] shadow-sm ring-1 ring-[#dbe6f7]"
                        : "text-[#334155] hover:bg-white hover:text-[#2563eb]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right desktop */}
            <div className="hidden items-center gap-2 xl:flex">
              <SignedOut>
                <div className="flex items-center gap-1.5">
                  {portalItems.map((item) => {
                    const Icon = item.icon;
                    const className =
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dbe6f7] bg-white px-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fbff] hover:text-[#2563eb]";

                    if (item.external) {
                      return (
                        <a key={item.href} href={item.href} className={className}>
                          <Icon className="h-3.5 w-3.5 text-[#2563eb]" />
                          {item.label}
                        </a>
                      );
                    }

                    return (
                      <Link key={item.href} to={item.href} className={className}>
                        <Icon className="h-3.5 w-3.5 text-[#2563eb]" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <button
                  onClick={() => clerk.openSignIn()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Login
                </button>
              </SignedOut>

              <SignedIn>
                <Link
                  to="/my-admission"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
                    isActive("/my-admission")
                      ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe6f7] bg-white text-[#334155] hover:bg-[#f8fbff] hover:text-[#2563eb]"
                  }`}
                >
                  <BedDouble className="h-3.5 w-3.5 text-[#2563eb]" />
                  My Admission
                </Link>
                <Link
                  to="/my-prescriptions"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
                    isActive("/my-prescriptions")
                      ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe6f7] bg-white text-[#334155] hover:bg-[#f8fbff] hover:text-[#2563eb]"
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5 text-[#2563eb]" />
                  My Prescriptions
                </Link>
                <Link
                  to="/notifications"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
                    isActive("/notifications")
                      ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe6f7] bg-white text-[#334155] hover:bg-[#f8fbff] hover:text-[#2563eb]"
                  }`}
                >
                  <Bell className="h-3.5 w-3.5 text-[#2563eb]" />
                  Notifications
                  {notificationBadge}
                </Link>
                <Link
                  to="/support"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
                    isActive("/support")
                      ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe6f7] bg-white text-[#334155] hover:bg-[#f8fbff] hover:text-[#2563eb]"
                  }`}
                >
                  <MessageSquareText className="h-3.5 w-3.5 text-[#2563eb]" />
                  Help Desk
                </Link>
                <Link
                  to="/my-radiology-reports"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
                    isActive("/my-radiology-reports")
                      ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe6f7] bg-white text-[#334155] hover:bg-[#f8fbff] hover:text-[#2563eb]"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-[#2563eb]" />
                  Radiology
                </Link>
                <Link
                  to="/my-lab-reports"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
                    isActive("/my-lab-reports")
                      ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe6f7] bg-white text-[#334155] hover:bg-[#f8fbff] hover:text-[#2563eb]"
                  }`}
                >
                  <FlaskConical className="h-3.5 w-3.5 text-[#2563eb]" />
                  Lab Reports
                </Link>
                <Link
                  to="/my-billing"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
                    isActive("/my-billing")
                      ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe6f7] bg-white text-[#334155] hover:bg-[#f8fbff] hover:text-[#2563eb]"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 text-[#2563eb]" />
                  Billing
                </Link>
                <AnimatedLogoutButton
                  onLogout={() => clerk.signOut({ redirectUrl: "/" })}
                />
              </SignedIn>
            </div>

            {/* Mobile button */}
            <button
              onClick={() => setIsOpen((s) => !s)}
              className="rounded-xl border border-[#dbe6f7] bg-[#f8fbff] p-2 text-[#334155] transition hover:text-[#2563eb] xl:hidden"
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div className="border-t border-[#e8eef8] bg-white px-3 py-3 xl:hidden">
              <div className="grid gap-2 sm:grid-cols-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                        active
                          ? "bg-[#2563eb] text-white"
                          : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}

                <SignedOut>
                  {portalItems.map((item) => {
                    const Icon = item.icon;
                    const className =
                      "inline-flex h-11 items-center gap-2.5 rounded-xl bg-[#f8fbff] px-3 text-sm font-semibold text-[#334155] transition hover:text-[#2563eb]";

                    if (item.external) {
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={className}
                        >
                          <Icon className="h-4 w-4 text-[#2563eb]" />
                          {item.label}
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={className}
                      >
                        <Icon className="h-4 w-4 text-[#2563eb]" />
                        {item.label}
                      </Link>
                    );
                  })}

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      clerk.openSignIn();
                    }}
                    className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-[#2563eb] px-3 text-sm font-semibold text-white"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                </SignedOut>

                <SignedIn>
                  <Link
                    to="/my-admission"
                    onClick={() => setIsOpen(false)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                      isActive("/my-admission")
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                    }`}
                  >
                    <BedDouble className="h-4 w-4" />
                    My Admission
                  </Link>
                  <Link
                    to="/my-prescriptions"
                    onClick={() => setIsOpen(false)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                      isActive("/my-prescriptions")
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                    My Prescriptions
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={() => setIsOpen(false)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                      isActive("/notifications")
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                    {notificationBadge}
                  </Link>
                  <Link
                    to="/support"
                    onClick={() => setIsOpen(false)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                      isActive("/support")
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                    }`}
                  >
                    <MessageSquareText className="h-4 w-4" />
                    Help Desk
                  </Link>
                  <Link
                    to="/my-radiology-reports"
                    onClick={() => setIsOpen(false)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                      isActive("/my-radiology-reports")
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Radiology Reports
                  </Link>
                  <Link
                    to="/my-lab-reports"
                    onClick={() => setIsOpen(false)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                      isActive("/my-lab-reports")
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                    }`}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Lab Reports
                  </Link>
                  <Link
                    to="/my-billing"
                    onClick={() => setIsOpen(false)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                      isActive("/my-billing")
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f8fbff] text-[#334155] hover:text-[#2563eb]"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </Link>
                  <div className="flex justify-start sm:col-span-2">
                    <AnimatedLogoutButton
                      onLogout={async () => {
                        setIsOpen(false);
                        await clerk.signOut({ redirectUrl: "/" });
                      }}
                    />
                  </div>
                </SignedIn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
