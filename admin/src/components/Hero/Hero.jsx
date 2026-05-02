"use client";

import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import AnimatedNavbar from "../Navbar/Navbar";
import bgImg from "../../assets/background1.png";

export default function Hero({ role = "admin", userName = "Doctor" }) {
  const isDoctor = role === "doctor";

  const title = isDoctor
    ? `Welcome, Dr. ${userName}`
    : "Hospital Admin Control Center";

  const subtitle = isDoctor
    ? "Access patient records, manage appointments, and review medical reports from one secure workspace."
    : "Manage doctors, nurses, staff, services, and appointments from one secure workspace.";

  const cards = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Secure Access",
      text: "Protected entry points for hospital administration.",
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: "Real-time Management",
      text: "Coordinate teams, services, and appointments quickly.",
    },
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: "Medical Dashboard",
      text: "A focused overview for daily operational decisions.",
    },
  ];

  return (
    <div className="admin-landing fixed inset-0 overflow-hidden bg-[#061226]">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImg})` }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,23,0.62)_0%,rgba(7,32,66,0.26)_38%,rgba(2,8,23,0.70)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.13)_0%,rgba(6,18,38,0.08)_42%,rgba(2,8,23,0.40)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,0.32)_0%,rgba(2,8,23,0.04)_48%,rgba(2,8,23,0.26)_100%)]" />

      <div className="relative z-10 flex h-full flex-col">
        <AnimatedNavbar />

        <main className="flex h-full items-center justify-center px-4 pb-5 pt-[5.95rem] sm:px-6 lg:px-8 lg:pb-6 lg:pt-[6.65rem]">
          <section className="relative mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-center text-center">
            <div className="pointer-events-none absolute top-[9%] h-[320px] w-full max-w-[880px] rounded-full bg-[#2563eb]/17 blur-3xl" />

            <div className="relative w-full max-w-[980px] px-2 py-2 sm:px-5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-[#061226]/34 px-3 py-1.5 text-[11px] font-bold leading-4 text-blue-100 shadow-[0_10px_30px_rgba(2,8,23,0.18)] backdrop-blur-[8px]">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-200" />
                Revive hospital administration
              </div>

              <h1 className="admin-hero-title mx-auto mt-4 max-w-5xl text-[2.55rem] font-bold leading-[0.98] tracking-normal text-white drop-shadow-[0_8px_28px_rgba(2,8,23,0.45)] sm:text-[3.45rem] lg:text-[4.25rem]">
                {title}
              </h1>

              <p className="mx-auto mt-4 max-w-[740px] text-[0.98rem] font-medium leading-[1.75] text-blue-50/84 drop-shadow-[0_3px_18px_rgba(2,8,23,0.42)] sm:text-[1.1rem]">
                {subtitle}
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/h"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f8fbff,#dbeafe)] px-6 text-[13.5px] font-bold text-[#12356f] shadow-[0_16px_36px_rgba(2,8,23,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(2,8,23,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]"
                >
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/appointments"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/22 bg-white/[0.08] px-6 text-[13.5px] font-bold text-white shadow-[0_14px_34px_rgba(2,8,23,0.18)] backdrop-blur-[8px] transition duration-200 hover:-translate-y-0.5 hover:border-white/34 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061226]"
                >
                  Review Appointments
                </Link>
              </div>
            </div>

            <div className="relative mt-5 w-full max-w-[1040px] rounded-[24px] border border-white/16 bg-[#061226]/28 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_46px_rgba(2,8,23,0.18)] backdrop-blur-[8px] sm:mt-8">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.title}
                    className="flex min-h-[86px] flex-col rounded-[20px] border border-white/12 bg-white/[0.07] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.11] hover:shadow-[0_12px_28px_rgba(2,8,23,0.16)] sm:min-h-[132px] sm:p-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-sky-200/18 bg-sky-200/[0.10] text-sky-100 shadow-sm sm:h-9 sm:w-9 sm:rounded-[14px]">
                        {card.icon}
                      </div>
                      <h2 className="text-[13.5px] font-bold leading-5 text-white sm:text-[14.5px]">
                        {card.title}
                      </h2>
                    </div>

                    <p className="mt-2 text-[12px] font-medium leading-[1.35] text-blue-50/72 sm:mt-4 sm:text-[13.5px] sm:leading-[1.6]">
                      {card.text}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
