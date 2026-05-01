import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Mail,
  Lock,
  ShieldCheck,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";
import logo from "../../assets/logo.png";
import { toastStyles } from "../../assets/dummyStyles";

const STORAGE_KEY = "doctorToken_v1";

export default function LoginPage({ apiBase }) {
  const API_BASE = apiBase || "http://localhost:4000";
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("All fields are required!", {
        style: toastStyles.errorToast,
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.message || "Login failed", { duration: 4000 });
        setBusy(false);
        return;
      }

      const token = json?.token || json?.data?.token;
      if (!token) {
        toast.error("Authentication token missing");
        setBusy(false);
        return;
      }

      const doctorId =
        json?.data?._id || json?.doctor?._id || json?.data?.doctor?._id;

      if (!doctorId) {
        toast.error("Doctor ID missing from server response");
        setBusy(false);
        return;
      }

      localStorage.setItem(STORAGE_KEY, token);
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: token }),
      );

      toast.success("Login successful — redirecting.", {
        style: toastStyles.successToast,
      });

      setTimeout(() => {
        navigate(`/doctor-admin/${doctorId}`);
      }, 700);
    } catch (err) {
      console.error("login error", err);
      toast.error("Network error during login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center px-4 py-8 lg:px-8">
        <div className="w-full max-w-[1180px] overflow-hidden rounded-[34px] border border-[#dbe6f7] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
            {/* Left side */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#0d1b3d] via-[#1f58d6] to-[#17336f] px-8 py-8 text-white lg:px-10 lg:py-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_24%)]" />

              <div className="relative z-10 flex h-full flex-col">
                <button
                  onClick={() => navigate("/")}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </button>

                <div className="mt-10 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-md">
                    <img
                      src={logo}
                      alt="Revive"
                      className="h-12 w-12 object-contain"
                    />
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      Revive
                    </h1>
                    <p className="text-sm text-white/75">
                      Doctor Dashboard Access
                    </p>
                  </div>
                </div>

                <div className="mt-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90">
                    <ShieldCheck className="h-4 w-4" />
                    Secure doctor portal
                  </div>

                  <h2 className="mt-6 text-4xl font-bold leading-tight">
                    Welcome back,
                    <span className="block text-white/90">
                      sign in to continue
                    </span>
                  </h2>

                  <p className="mt-4 max-w-md text-base leading-7 text-white/75">
                    Manage your appointments, update your medical profile, and
                    review your doctor dashboard in the same theme as your admin
                    pages.
                  </p>
                </div>

                <div className="mt-auto grid gap-4 pt-10 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm font-semibold">Appointments</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      View and manage your patient bookings.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm font-semibold">Profile & Schedule</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Keep your credentials and availability updated.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="bg-[#f8fafc] px-6 py-8 lg:px-10 lg:py-10">
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-[560px]">
                  <div className="mb-6">
                    <h3 className="text-[2rem] font-bold tracking-tight text-[#0f172a]">
                      Doctor Admin Login
                    </h3>
                    <p className="mt-2 text-[0.98rem] text-[#64748b]">
                      Sign in to manage your profile and schedule
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-[30px] border border-[#e5eaf5] bg-white shadow-sm">
                    <div className="border-b border-[#e5eaf5] bg-[#eef4fb] px-6 py-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
                          <LogIn className="h-5 w-5" />
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-[#0f172a]">
                            Access Doctor Panel
                          </h4>
                          <p className="mt-1 text-sm text-[#64748b]">
                            Enter your doctor credentials to continue.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleLogin} className="px-6 py-6">
                      <div className="space-y-5">
                        <div>
                          <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                            <input
                              type="email"
                              name="email"
                              placeholder="doctor@email.com"
                              value={formData.email}
                              onChange={handleChange}
                              className="h-12 w-full rounded-[18px] border border-[#dfe6f4] bg-[#f8fafc] pl-11 pr-4 text-[#0f172a] outline-none transition focus:border-[#b9cdf8] focus:bg-white"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                            Password
                          </label>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                            <input
                              type={showPassword ? "text" : "password"}
                              name="password"
                              placeholder="Doctor password"
                              value={formData.password}
                              onChange={handleChange}
                              className="h-12 w-full rounded-[18px] border border-[#dfe6f4] bg-[#f8fafc] pl-11 pr-12 text-[#0f172a] outline-none transition focus:border-[#b9cdf8] focus:bg-white"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((s) => !s)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={busy}
                          className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[18px] text-sm font-semibold transition ${
                            busy
                              ? "cursor-not-allowed bg-[#9bb8f8] text-white"
                              : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                          }`}
                        >
                          <LogIn className="h-4 w-4" />
                          {busy ? "Signing in..." : "Login"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <p className="mt-5 text-sm text-[#94a3b8]">
                    This page keeps the same doctor login backend behavior and
                    only updates the visual theme.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
