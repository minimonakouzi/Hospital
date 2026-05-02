import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../Navbar/Navbar";

const API_BASE = "http://localhost:4000/api";
const NURSE_TOKEN_KEY = "nurseToken_v1";
const NURSE_INFO_KEY = "nurseInfo_v1";

export default function NurseLayout() {
  const [nurse, setNurse] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const logout = useCallback(() => {
    localStorage.removeItem(NURSE_TOKEN_KEY);
    localStorage.removeItem(NURSE_INFO_KEY);
    navigate("/nurse/login", { replace: true });
  }, [navigate]);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem(NURSE_TOKEN_KEY);
    if (!token) {
      logout();
      return;
    }

    if (!silent) setLoading(true);
    if (!silent) setError("");

    try {
      const res = await fetch(`${API_BASE}/nurses/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout();
          return;
        }
        throw new Error(body?.message || "Unable to load nurse workspace.");
      }

      if (!body?.success) {
        throw new Error(body?.message || "Unable to load nurse workspace.");
      }

      const nextDashboard = body?.data || null;
      const nextNurse = nextDashboard?.nurse || null;
      if (!nextDashboard || !nextNurse) {
        throw new Error("Nurse workspace data is unavailable.");
      }

      setDashboard(nextDashboard);
      setNurse(nextNurse);
      localStorage.setItem(NURSE_INFO_KEY, JSON.stringify(nextNurse));
    } catch (err) {
      console.error("load nurse workspace error:", err);
      setError(err?.message || "Unable to load nurse workspace.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const cached = JSON.parse(localStorage.getItem(NURSE_INFO_KEY) || "null");
        if (active && cached?.name) setNurse(cached);
      } catch {
        localStorage.removeItem(NURSE_INFO_KEY);
      }

      if (active) await loadDashboard();
    }

    run();

    return () => {
      active = false;
    };
  }, [loadDashboard]);

  return (
    <div className="nurse-shell min-h-[100dvh] bg-[#f8fafc] text-[#0f172a]">
      <Navbar nurse={nurse} />

      <main className="nurse-main min-h-[100dvh] min-w-0 overflow-x-hidden bg-[#f8fafc] lg:pl-[270px]">
        <div className="min-h-[100dvh] bg-[#f8fafc]">
          {loading ? (
            <div className="flex min-h-[100dvh] items-center justify-center px-4">
              <div className="w-full max-w-md rounded-3xl border border-[#dbe6f7] bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 h-2 w-36 overflow-hidden rounded-full bg-[#dbeafe]">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-[#2563eb]" />
                </div>
                <p className="text-sm font-semibold text-[#2563eb]">
                  Loading nurse workspace...
                </p>
                <p className="mt-2 text-xs font-medium text-[#64748b]">
                  Preparing your dashboard.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[100dvh] items-center justify-center px-4">
              <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-[#fffafa] p-6 text-center shadow-sm">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={() => loadDashboard()}
                  className="mt-4 h-11 rounded-2xl bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <Outlet
              context={{
                nurse,
                dashboard,
                refreshDashboard: () => loadDashboard({ silent: true }),
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
