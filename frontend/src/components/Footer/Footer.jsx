import React from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
} from "lucide-react";
import logo from "../../assets/logo.png";

export default function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/50 bg-[#eef6ff]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_22%)]" />

      <div className="relative z-10 mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/70 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-8 px-6 py-8 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4fb] shadow-sm">
                  <img
                    src={logo}
                    alt="Revive"
                    className="h-8 w-8 object-contain"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-bold tracking-tight text-[#0f172a]">
                    Revive<span className="text-[#2563eb]">+</span>
                  </h3>
                  <p className="text-xs text-[#64748b]">Healthcare Solutions</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-[#475569]">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[#2563eb]" />
                  <span>+961 81727941</span>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#2563eb]" />
                  <span>monakouzi1@gmail.com</span>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#2563eb]" />
                  <span>Ajaltoun, Lebanon</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                Quick Links
              </h4>

              <div className="mt-4 space-y-3">
                <Link
                  to="/"
                  className="block text-sm text-[#334155] transition hover:text-[#2563eb]"
                >
                  Home
                </Link>
                <Link
                  to="/doctors"
                  className="block text-sm text-[#334155] transition hover:text-[#2563eb]"
                >
                  Doctors
                </Link>
                <Link
                  to="/services"
                  className="block text-sm text-[#334155] transition hover:text-[#2563eb]"
                >
                  Services
                </Link>
                <Link
                  to="/contact"
                  className="block text-sm text-[#334155] transition hover:text-[#2563eb]"
                >
                  Contact
                </Link>
                <Link
                  to="/appointments"
                  className="block text-sm text-[#334155] transition hover:text-[#2563eb]"
                >
                  Appointments
                </Link>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                Our Services
              </h4>

              <div className="mt-4 space-y-3">
                <p className="text-sm text-[#334155]">Blood Pressure Check</p>
                <p className="text-sm text-[#334155]">Blood Sugar Test</p>
                <p className="text-sm text-[#334155]">Full Blood Count</p>
                <p className="text-sm text-[#334155]">X-Ray Scan</p>
                <p className="text-sm text-[#334155]">Thyroid Test</p>
              </div>
            </div>

            {/* Stay Connected */}
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                Stay Connected
              </h4>

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Email Sgur"
                  className="h-11 w-full rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-[#0f172a] outline-none"
                />
                <input
                  type="text"
                  placeholder="Email Sgur"
                  className="h-11 w-full rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-[#0f172a] outline-none"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { icon: Facebook, label: "Facebook" },
                  { icon: Twitter, label: "Twitter" },
                  { icon: Instagram, label: "Instagram" },
                  { icon: Linkedin, label: "LinkedIn" },
                  { icon: Youtube, label: "YouTube" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe6f7] bg-white text-[#64748b] transition hover:border-[#bfd3fa] hover:text-[#2563eb]"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#e8eef8] px-6 py-4 text-center text-xs text-[#94a3b8] lg:px-8">
            © 2025 Revive Healthcare Solutions
          </div>
        </div>
      </div>
    </footer>
  );
}
