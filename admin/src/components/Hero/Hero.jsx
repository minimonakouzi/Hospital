"use client";

import React from "react";
import { ShieldCheck, Activity, LayoutDashboard } from "lucide-react";
import AnimatedNavbar from "../Navbar/Navbar";
import bgImg from "../../assets/background1.png";

export default function Hero({ role = "admin", userName = "Doctor" }) {
  const isDoctor = role === "doctor";

  const cards = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Secure Access",
      text: "Role-based login with protected medical data.",
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: "Real-time Management",
      text: "Monitor hospital activity and patient flow.",
    },
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: "Medical Dashboard",
      text: "Clean, fast, and doctor-friendly interface.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImg})` }}
      />

      {/* Light overlay */}
      <div className="absolute inset-0 bg-white/10" />

      {/* Soft glow accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-[18%] h-44 w-44 rounded-full bg-blue-200/25 blur-3xl" />
        <div className="absolute right-[10%] top-[26%] h-52 w-52 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="absolute bottom-[10%] left-[24%] h-44 w-44 rounded-full bg-sky-200/15 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen">
        <AnimatedNavbar />

        {/* CENTERED HERO */}
        <main className="flex min-h-[100svh] items-center justify-center px-4 sm:px-6 lg:px-8 pt-24">
          <section className="w-full flex justify-center">
            <div className="w-full max-w-[980px] mx-auto rounded-[26px] border border-white/60 bg-white/28 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 shadow-[0_18px_50px_rgba(30,64,175,0.10)] backdrop-blur-xl">
              {/* Title */}
              <div className="text-center max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold uppercase tracking-tight bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] bg-clip-text text-transparent sm:text-4xl lg:text-5xl">
                  {isDoctor
                    ? `Welcome, Dr. ${userName}`
                    : "WELCOME TO REVIVE ADMIN PANEL"}
                </h1>

                <p className="mt-4 text-sm sm:text-base text-slate-500 leading-7">
                  {isDoctor
                    ? "Access your patient records, manage appointments, and review medical reports securely from your dashboard."
                    : "Manage hospital operations, doctors, staff, patient records, and system settings from a centralized control panel."}
                </p>
              </div>

              {/* Cards */}
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:mt-10 lg:gap-5">
                {cards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[20px] border border-white/70 bg-white/40 p-5 shadow-sm backdrop-blur-md transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      {card.icon}
                    </div>

                    <h3 className="text-lg font-bold text-slate-800">
                      {card.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {card.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
