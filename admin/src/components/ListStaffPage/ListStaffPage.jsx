import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

const API_BASE = "http://localhost:4000";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S"
  );
}

function StatusBadge({ status }) {
  const active = status !== "Inactive";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {status || "Active"}
    </span>
  );
}

export default function ListStaffPage() {
  const { getToken } = useAuth();
  const [staff, setStaff] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/staff`, {
        headers: await adminAuthHeaders(getToken),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to load staff.");
      }

      setStaff(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error("fetch staff error:", err);
      setError(err?.message || "Network error while loading staff.");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const updateStaffStatus = useCallback(
    async (item, status) => {
      const id = item._id || item.id;
      if (!id || item.status === status) return;

      try {
        setUpdatingId(id);
        setNotice({ type: "", text: "" });
        const res = await fetch(`${API_BASE}/api/staff/${id}/status`, {
          method: "PATCH",
          headers: {
            ...(await adminAuthHeaders(getToken)),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(body?.message || "Failed to update staff status.");
        }

        setStaff((prev) =>
          prev.map((staffMember) =>
            (staffMember._id || staffMember.id) === id
              ? { ...staffMember, status: body?.data?.status || status }
              : staffMember,
          ),
        );
        setNotice({
          type: "success",
          text: body?.message || `Staff account marked ${status}.`,
        });
      } catch (err) {
        console.error("update staff status error:", err);
        const isNetworkError = err instanceof TypeError;
        setNotice({
          type: "error",
          text: isNetworkError
            ? "Unable to reach the server. Check that the backend is running and allows status updates."
            : err?.message || "Unable to update staff status.",
        });
      } finally {
        setUpdatingId("");
      }
    },
    [getToken],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((item) =>
      [item.name, item.email, item.phone, item.department, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [staff, query]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Staff Directory</h2>
                <p className="text-sm text-slate-500">Service management accounts</p>
              </div>
            </div>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:bg-white"
              placeholder="Search staff..."
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{staff.length}</p>
          </div>
          <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {staff.filter((item) => item.status !== "Inactive").length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Inactive</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {staff.filter((item) => item.status === "Inactive").length}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {notice.text ? (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                notice.type === "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-rose-100 bg-rose-50 text-rose-700"
              }`}
            >
              {notice.text}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-10 text-blue-600">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading staff...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f8fbff] px-4 py-10 text-center text-sm text-slate-500">
              No staff members found.
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((item) => (
                <article
                  key={item._id || item.id || item.email}
                  className="rounded-2xl border border-[#dbe6f7] bg-[#fbfdff] p-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_0.7fr_0.7fr] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700">
                        {initials(item.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {item.name || "Unnamed Staff"}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {item.department || "No department"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-1 text-sm text-slate-500">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="truncate">{item.email || "-"}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="truncate">{item.phone || "-"}</span>
                      </div>
                    </div>

                    <div>
                      <StatusBadge status={item.status} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Active", "Inactive"].map((statusOption) => {
                          const id = item._id || item.id;
                          const selected = (item.status || "Active") === statusOption;
                          return (
                            <button
                              key={statusOption}
                              type="button"
                              disabled={selected || updatingId === id}
                              onClick={() => updateStaffStatus(item, statusOption)}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                selected
                                  ? "bg-blue-600 text-white"
                                  : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                              } disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                              {updatingId === id && !selected ? "Saving..." : statusOption}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500 lg:justify-end">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
