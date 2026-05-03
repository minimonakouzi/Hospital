import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Clock3,
  Users,
  Stethoscope,
  CalendarDays,
  FileHeart,
  ArrowRight,
} from "lucide-react";
import heroImage from "../../assets/BannerImg.png";

export default function Banner() {
  const highlights = [
    {
      icon: CalendarDays,
      title: "Appointments",
      text: "Find doctors and book available visits online.",
    },
    {
      icon: FileHeart,
      title: "Records",
      text: "Access your medical records from the patient portal.",
    },
    {
      icon: ShieldCheck,
      title: "Services",
      text: "Explore hospital services before continuing to booking.",
    },
  ];

  return (
    <section className="relative w-full">
      <style>{`
        @keyframes scanner-x {
          0% {
            transform: translateX(-115%);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          50% {
            transform: translateX(115%);
            opacity: 0.95;
          }
          100% {
            transform: translateX(115%);
            opacity: 0;
          }
        }

        @keyframes scanner-y {
          0% {
            transform: translateY(-115%);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          50% {
            transform: translateY(115%);
            opacity: 0.85;
          }
          100% {
            transform: translateY(115%);
            opacity: 0;
          }
        }
      `}</style>

      <div className="relative mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[28px]"
        >
          {/* scanner border layer */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] p-[2px]">
            <div className="absolute inset-0 rounded-[28px] border border-white/18 bg-white/[0.06]" />

            {/* top scanner */}
            <div className="absolute left-0 top-0 h-[2px] w-full overflow-hidden rounded-full">
              <div
                className="h-full w-[30%] rounded-full blur-[1px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(125,211,252,0.95), rgba(59,130,246,0.95), transparent)",
                  animation: "scanner-x 4.6s ease-in-out infinite",
                }}
              />
            </div>

            {/* bottom scanner */}
            <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden rounded-full">
              <div
                className="h-full w-[26%] rounded-full blur-[1px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(191,219,254,0.95), rgba(56,189,248,0.9), transparent)",
                  animation: "scanner-x 5.2s ease-in-out infinite 1.2s",
                }}
              />
            </div>

            {/* left scanner */}
            <div className="absolute left-0 top-0 h-full w-[2px] overflow-hidden rounded-full">
              <div
                className="h-[28%] w-full rounded-full blur-[1px]"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(147,197,253,0.9), rgba(59,130,246,0.95), transparent)",
                  animation: "scanner-y 4.8s ease-in-out infinite 0.4s",
                }}
              />
            </div>

            {/* right scanner */}
            <div className="absolute right-0 top-0 h-full w-[2px] overflow-hidden rounded-full">
              <div
                className="h-[24%] w-full rounded-full blur-[1px]"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(186,230,253,0.9), rgba(14,165,233,0.95), transparent)",
                  animation: "scanner-y 5.4s ease-in-out infinite 1.6s",
                }}
              />
            </div>
          </div>

          {/* main card */}
          <div className="relative z-10 overflow-hidden rounded-[26px] border border-white/16 bg-[#061226]/32 shadow-[0_22px_60px_rgba(2,8,23,0.24)] backdrop-blur-[10px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.13),rgba(255,255,255,0.04)_42%,rgba(37,99,235,0.13))]" />

            <div className="relative z-10 grid items-center gap-8 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-10">
              {/* left */}
              <div className="max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12, duration: 0.55 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.09] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-100 shadow-[0_10px_30px_rgba(2,8,23,0.16)] backdrop-blur-[8px] sm:text-sm"
                >
                  <Stethoscope className="h-4 w-4" />
                  Revive patient care
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mt-5 text-3xl font-bold leading-tight tracking-normal text-white drop-shadow-[0_8px_28px_rgba(2,8,23,0.45)] sm:text-4xl lg:text-5xl xl:text-[3.35rem]"
                >
                  Modern healthcare,
                  <span className="block text-blue-100">designed around you</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.55 }}
                  className="mt-4 max-w-2xl text-sm font-medium leading-7 text-blue-50/84 drop-shadow-[0_3px_18px_rgba(2,8,23,0.35)] sm:text-base lg:text-[1.02rem]"
                >
                  Book appointments, discover trusted doctors, and explore
                  Revive Hospital services through a clear, secure patient web
                  experience.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.55 }}
                  className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  {highlights.map(({ icon: Icon, title, text }) => (
                    <div
                      key={title}
                      className="rounded-[20px] border border-white/12 bg-white/[0.07] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-sky-200/18 bg-sky-200/[0.10] text-sky-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-3 text-sm font-bold text-white">
                        {title}
                      </h2>
                      <p className="mt-1 text-xs font-medium leading-5 text-blue-50/72">
                        {text}
                      </p>
                    </div>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.55 }}
                  className="mt-7 flex flex-col gap-3 sm:flex-row"
                >
                  <a
                    href="/doctors"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f8fbff,#dbeafe)] px-7 text-sm font-bold text-[#12356f] shadow-[0_16px_36px_rgba(2,8,23,0.24)] transition hover:-translate-y-0.5"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Book Appointment
                    <ArrowRight className="h-4 w-4" />
                  </a>

                  <a
                    href="/services"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/22 bg-white/[0.08] px-7 text-sm font-bold text-white shadow-[0_14px_34px_rgba(2,8,23,0.18)] backdrop-blur-[8px] transition hover:-translate-y-0.5 hover:border-white/34 hover:bg-white/[0.14]"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Explore Services
                  </a>
                </motion.div>
              </div>

              {/* right */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.65 }}
                className="relative mx-auto w-full max-w-[500px]"
              >
                <div className="relative overflow-hidden rounded-[24px] border border-white/16 bg-white/[0.08] p-3 shadow-[0_18px_46px_rgba(2,8,23,0.18)] backdrop-blur-[8px] sm:p-4">
                  <div className="overflow-hidden rounded-[20px] border border-white/12 bg-white/[0.10]">
                    <img
                      src={heroImage}
                      alt="Revive healthcare"
                      className="mx-auto w-full max-w-[470px] object-contain"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[18px] border border-white/12 bg-white/[0.07] px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Clock3 className="h-4 w-4 text-sky-100" />
                        Plan visits
                      </div>
                      <p className="mt-1 text-xs leading-5 text-blue-50/72">
                        View available doctor and service booking paths.
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/12 bg-white/[0.07] px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Users className="h-4 w-4 text-sky-100" />
                        Patient portal
                      </div>
                      <p className="mt-1 text-xs leading-5 text-blue-50/72">
                        Keep records and appointment details easy to find.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
