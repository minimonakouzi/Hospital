import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "../../assets/logo.png";

const API_BASE = "http://localhost:4000";
const STAFF_TOKEN_KEY = "staffToken_v1";
const STAFF_INFO_KEY = "staffInfo_v1";

export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    window.location.href = "http://localhost:5173/";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.token) {
        throw new Error(body?.message || "Invalid staff credentials.");
      }

      localStorage.setItem(STAFF_TOKEN_KEY, body.token);
      localStorage.setItem(STAFF_INFO_KEY, JSON.stringify(body.data || {}));
      navigate("/staff/services", { replace: true });
    } catch (err) {
      console.error("staff login error:", err);
      setMessage(err?.message || "Staff login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center px-4 py-8 lg:px-8">
        <div className="w-full max-w-[1180px] overflow-hidden rounded-[34px] border border-[#dbe6f7] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative overflow-hidden bg-gradient-to-b from-[#0d1b3d] via-[#1f58d6] to-[#17336f] px-8 py-8 text-white lg:px-10 lg:py-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_24%)]" />

              <div className="relative z-10 flex h-full flex-col">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </button>

                <div className="mt-10 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-md">
                    <img
                      src={logoImg}
                      alt="Revive"
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Revive</h1>
                    <p className="text-sm text-white/75">Staff Portal</p>
                  </div>
                </div>

                <div className="mt-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90">
                    <ShieldCheck className="h-4 w-4" />
                    Secure staff access
                  </div>

                  <h2 className="mt-6 text-4xl font-bold leading-tight">
                    Sign in to manage
                    <span className="block text-white/90">hospital services</span>
                  </h2>

                  <p className="mt-4 max-w-md text-base leading-7 text-white/75">
                    Use your staff account to manage service listings,
                    appointments, and profile details.
                  </p>
                </div>

                <div className="mt-auto grid gap-4 pt-10 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm font-semibold">Services</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Keep hospital service information organized.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm font-semibold">Appointments</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Review service bookings from one focused workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-6 py-8 lg:px-10 lg:py-10">
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-[560px]">
                  <div className="mb-6">
                    <h3 className="text-[2rem] font-bold tracking-tight text-[#0f172a]">
                      Staff Login
                    </h3>
                    <p className="mt-2 text-[0.98rem] text-[#64748b]">
                      Enter your staff account credentials
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
                            Access Staff Panel
                          </h4>
                          <p className="mt-1 text-sm text-[#64748b]">
                            Accounts are created by hospital admins.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-6">
                      <div className="space-y-5">
                        <div>
                          <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="h-12 w-full rounded-[18px] border border-[#dfe6f4] bg-[#f8fafc] pl-11 pr-4 text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#b9cdf8] focus:bg-white"
                              placeholder="staff@revive.com"
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
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-12 w-full rounded-[18px] border border-[#dfe6f4] bg-[#f8fafc] pl-11 pr-12 text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#b9cdf8] focus:bg-white"
                              placeholder="Your password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((value) => !value)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {message ? (
                          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                            {message}
                          </div>
                        ) : null}

                        <button
                          type="submit"
                          disabled={loading}
                          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#2563eb] text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9bb8f8]"
                        >
                          <LogIn className="h-4 w-4" />
                          {loading ? "Signing in..." : "Login"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
