import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Clock3,
  Users,
  Stethoscope,
  Star,
  CalendarDays,
} from "lucide-react";
import heroImage from "../../assets/BannerImg.png";

export default function Banner() {
  const stats = [
    { icon: ShieldCheck, text: "Certified Care" },
    { icon: Clock3, text: "24/7 Booking" },
    { icon: Users, text: "Trusted Specialists" },
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
          className="relative overflow-hidden rounded-[32px]"
        >
          {/* scanner border layer */}
          <div className="pointer-events-none absolute inset-0 rounded-[32px] p-[2px]">
            <div className="absolute inset-0 rounded-[32px] border border-white/55 bg-white/10" />

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
          <div className="relative z-10 overflow-hidden rounded-[30px] border border-white/60 bg-white/28 shadow-[0_18px_50px_rgba(30,64,175,0.10)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.40),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.22),transparent_24%)]" />

            <div className="relative z-10 grid items-center gap-8 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
              {/* left */}
              <div className="max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12, duration: 0.55 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2563eb] sm:text-sm"
                >
                  <Stethoscope className="h-4 w-4" />
                  Revive Healthcare Platform
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mt-5 text-3xl font-bold leading-tight text-[#0f172a] sm:text-4xl lg:text-5xl xl:text-[3.25rem]"
                >
                  Modern Healthcare
                  <span className="block text-[#2563eb]">
                    Designed Around Patients
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.55 }}
                  className="mt-4 max-w-2xl text-sm leading-7 text-[#475569] sm:text-base lg:text-[1.02rem]"
                >
                  Book appointments, discover trusted doctors, and explore
                  hospital services through a cleaner, more professional Revive
                  experience.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.34, duration: 0.45 }}
                  className="mt-4 flex flex-wrap items-center gap-2 text-amber-400"
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                  <span className="ml-1 text-sm font-semibold text-[#475569]">
                    Trusted by patients and specialists
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.55 }}
                  className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  {stats.map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/42 px-3 py-3.5 shadow-sm"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-[#334155]">
                        {text}
                      </span>
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
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Book Appointment
                  </a>

                  <a
                    href="/services"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/80 bg-white/55 px-7 py-3.5 text-sm font-semibold text-[#2563eb] transition hover:bg-white/70"
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
                <div className="absolute -left-4 top-8 h-24 w-24 rounded-full bg-blue-200/40 blur-2xl" />
                <div className="absolute -right-2 bottom-6 h-28 w-28 rounded-full bg-cyan-200/40 blur-2xl" />

                <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/26 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4">
                  <div className="overflow-hidden rounded-[22px] bg-white/28">
                    <img
                      src={heroImage}
                      alt="Revive healthcare"
                      className="mx-auto w-full max-w-[470px] object-contain"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[18px] border border-white/65 bg-white/42 px-4 py-3 text-center">
                      <div className="text-xl font-bold text-[#0f172a] sm:text-2xl">
                        500+
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#64748b] sm:text-xs">
                        Appointments Managed
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/65 bg-white/42 px-4 py-3 text-center">
                      <div className="text-xl font-bold text-[#2563eb] sm:text-2xl">
                        4.9/5
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#64748b] sm:text-xs">
                        Patient Satisfaction
                      </div>
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
