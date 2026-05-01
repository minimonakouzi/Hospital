import React from "react";
import { ShieldCheck, BadgeCheck, Sparkles } from "lucide-react";

const certificationItems = [
  {
    icon: ShieldCheck,
    title: "Certified Standards",
    text: "Built around trusted healthcare quality and patient-first processes.",
  },
  {
    icon: BadgeCheck,
    title: "Reliable Experience",
    text: "A cleaner and more consistent hospital interface across the platform.",
  },
  {
    icon: Sparkles,
    title: "Professional Design",
    text: "Aligned visually with the rest of your frontend blue-and-white style.",
  },
];

const Certification = () => {
  return (
    <section className="w-full px-0 py-4 md:py-5">
      <div className="relative w-full overflow-hidden border-y border-white/20 px-4 py-8 md:px-8 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.10)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.30),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.25),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#bfdbfe]/60" />

        <div className="relative z-10 mx-auto max-w-[1380px]">
          <div className="overflow-hidden rounded-[34px] border border-white/55 bg-white/28 px-6 py-8 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl md:px-8 md:py-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                <ShieldCheck className="h-4 w-4" />
                Revive Quality Promise
              </div>

              <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#0f172a] md:text-4xl">
                Certified Care,
                <span className="block text-[#2563eb]">Modern Experience</span>
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#475569] md:text-base">
                This section stays light and transparent so your home background
                image remains visible without giving a dark theme feel.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {certificationItems.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-[26px] border border-white/65 bg-white/38 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/48"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-[#0f172a]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#475569]">
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white/45 px-4 py-2 text-xs font-semibold text-[#2563eb]">
                <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
                OFFICIALLY CERTIFIED
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Certification;
