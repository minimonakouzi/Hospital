import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Activity,
  BadgeCheck,
  Clock3,
  Filter,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

const API_BASE = "http://localhost:4000/api";

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function StatusBadge({ status }) {
  const classes =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Inactive"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {status || "Active"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ListNursesPage() {
  const { getToken } = useAuth();
  const [nurses, setNurses] = useState([]);
  const [query, setQuery] = useState("");
  const [shift, setShift] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });

  async function fetchNurses() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/nurses`, {
        headers: await adminAuthHeaders(getToken),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.message || "Failed to load nurses.");
        setNurses([]);
        return;
      }

      const list = Array.isArray(body?.data) ? body.data : [];
      setNurses(list);
    } catch (err) {
      console.error("fetch nurses error:", err);
      setError("Network error while loading nurses.");
      setNurses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNurses();
  }, []);

  const updateNurseStatus = useCallback(
    async (nurse, nextStatus) => {
      const id = nurse._id || nurse.id;
      if (!id || nurse.status === nextStatus) return;

      try {
        setUpdatingId(id);
        setNotice({ type: "", text: "" });
        const res = await fetch(`${API_BASE}/nurses/${id}/status`, {
          method: "PATCH",
          headers: {
            ...(await adminAuthHeaders(getToken)),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(body?.message || "Failed to update nurse status.");
        }

        setNurses((prev) =>
          prev.map((item) =>
            (item._id || item.id) === id
              ? { ...item, status: body?.data?.status || nextStatus }
              : item,
          ),
        );
        setNotice({
          type: "success",
          text: body?.message || `Nurse account marked ${nextStatus}.`,
        });
      } catch (err) {
        console.error("update nurse status error:", err);
        const isNetworkError = err instanceof TypeError;
        setNotice({
          type: "error",
          text: isNetworkError
            ? "Unable to reach the server. Check that the backend is running and allows status updates."
            : err?.message || "Unable to update nurse status.",
        });
      } finally {
        setUpdatingId("");
      }
    },
    [getToken],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nurses
      .filter((nurse) => (shift === "all" ? true : nurse.shift === shift))
      .filter((nurse) => (status === "all" ? true : nurse.status === status))
      .filter((nurse) => {
        if (!q) return true;
        return [
          nurse.name,
          nurse.department,
          nurse.email,
          nurse.phone,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [nurses, query, shift, status]);

  const activeCount = nurses.filter((nurse) => nurse.status === "Active").length;
  const departmentCount = new Set(
    nurses.map((nurse) => nurse.department).filter(Boolean),
  ).size;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-[#eef4fb] px-3 py-1 text-xs font-semibold text-[#2563eb]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin nurse records
            </div>
            <h1 className="mt-4 text-[1.9rem] font-bold tracking-tight text-slate-900">
              Nurse Directory
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Browse nurses created through the admin dashboard. Search and
              filters stay local for fast review.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[520px]">
            {[
              ["Total Nurses", nurses.length, UsersRound],
              ["Active", activeCount, BadgeCheck],
              ["Departments", departmentCount, Activity],
            ].map(([label, value, Icon]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                    {label}
                  </p>
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nurses, departments, email..."
              className="h-12 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
            >
              <option value="all">All shifts</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
              <option value="Rotating">Rotating</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setShift("all");
                setStatus("all");
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-100 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {notice.text ? (
          <div
            className={`border-b px-6 py-4 text-sm font-semibold ${
              notice.type === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-rose-100 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-14 text-sm font-medium text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Loading nurses...
          </div>
        ) : nurses.length === 0 ? (
          <div className="px-6 py-14">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                <UsersRound className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No nurses yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add the first nurse from the Add Nurse page. New records will
                appear here after creation.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No nurses match the current search or filters.
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.35fr_1fr_0.85fr_0.9fr_1.2fr_0.8fr] gap-4 bg-[#f8fbff] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
              <div>Nurse</div>
              <div>Department</div>
              <div>Shift</div>
              <div>Status</div>
              <div>Contact</div>
              <div>Created</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filtered.map((nurse, index) => (
                <article
                  key={nurse._id || nurse.id || nurse.email}
                  className="grid grid-cols-1 gap-4 px-5 py-5 transition hover:bg-[#f8fbff] lg:grid-cols-[1.35fr_1fr_0.85fr_0.9fr_1.2fr_0.8fr] lg:items-center lg:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold ${
                        index % 2 === 0
                          ? "bg-blue-100 text-blue-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {initials(nurse.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-slate-900">
                        {nurse.name || "Unnamed Nurse"}
                      </h2>
                      <p className="mt-1 truncate text-xs font-medium text-blue-700">
                        {nurse.specialization || nurse.email}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {nurse.department || "No department"}
                    </p>
                    {nurse.specialization ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {nurse.specialization}
                      </p>
                    ) : null}
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                    <Clock3 className="h-4 w-4" />
                    {nurse.shift || "Morning"}
                  </div>

                  <div>
                    <StatusBadge status={nurse.status} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Active", "Inactive"].map((statusOption) => {
                        const id = nurse._id || nurse.id;
                        const selected = (nurse.status || "Active") === statusOption;
                        return (
                          <button
                            key={statusOption}
                            type="button"
                            disabled={selected || updatingId === id}
                            onClick={() => updateNurseStatus(nurse, statusOption)}
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
                    {nurse.experience ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {nurse.experience}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-500">
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                      {nurse.phone || "No phone"}
                    </p>
                    <p className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                      <span className="truncate">{nurse.email}</span>
                    </p>
                  </div>

                  <div className="text-sm text-slate-500">
                    {formatDate(nurse.createdAt) || "-"}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
