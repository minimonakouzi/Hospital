import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Filter,
  HeartPulse,
  Search,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { fetchPerformanceSummary } from "../api/performanceApi";

const currentYear = new Date().getFullYear();
const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({ label, value: String(index + 1) }));

const filterOptions = {
  years: [currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(String),
  months: monthOptions,
  days: [
    { label: "All Days", value: "All Days" },
    ...Array.from({ length: 31 }, (_, index) => ({
      label: String(index + 1),
      value: String(index + 1),
    })),
  ],
  roles: ["All Roles", "Doctor", "Nurse", "Staff"],
  shifts: ["All Shifts", "Morning", "Evening", "Night", "Rotating", "Unassigned"],
  statuses: ["All Statuses", "Present", "Absent", "Late", "On Leave"],
};

const roleBadgeStyles = {
  Doctor: "bg-blue-50 text-blue-700 ring-blue-100",
  Nurse: "bg-teal-50 text-teal-700 ring-teal-100",
  Staff: "bg-violet-50 text-violet-700 ring-violet-100",
};

const statusBadgeStyles = {
  Present: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Absent: "bg-rose-50 text-rose-700 ring-rose-100",
  Late: "bg-amber-50 text-amber-700 ring-amber-100",
  "On Leave": "bg-sky-50 text-sky-700 ring-sky-100",
};

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeOptions(options) {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
      >
        {normalizeOptions(options).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ value, type }) {
  const styles =
    type === "role"
      ? roleBadgeStyles[value] || "bg-slate-50 text-slate-700 ring-slate-100"
      : statusBadgeStyles[value] || "bg-slate-50 text-slate-700 ring-slate-100";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${styles}`}>
      {value || "-"}
    </span>
  );
}

function ProgressBar({ value, color = "bg-blue-500" }) {
  const width = Math.max(0, Math.min(100, safeNumber(value)));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-[#eef4fb]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function OverviewCard({ label, value, helper, icon, tone = "bg-blue-50", wide = false }) {
  return (
    <article className={`rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm ${wide ? "xl:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <div className="mt-4 text-3xl font-bold leading-none tabular-nums text-slate-900">{value}</div>
          <p className="mt-3 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>{icon}</div>
      </div>
    </article>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-blue-600">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function BarList({ items, valueSuffix = "", color = "bg-blue-500", emptyText = "No matching data." }) {
  const safeItems = items?.length ? items : [];
  const maxValue = Math.max(...safeItems.map((item) => safeNumber(item.value)), 1);

  if (!safeItems.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f8fbff] px-4 py-8 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeItems.map((item) => {
        const value = safeNumber(item.value);
        return (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="font-bold tabular-nums text-slate-900">
                {value}
                {valueSuffix}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#eef4fb]">
              <div
                className={`h-full rounded-full ${item.color || color}`}
                style={{ width: value ? `${Math.max((value / maxValue) * 100, 6)}%` : "0%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleHealth({ roles }) {
  return (
    <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm xl:col-span-2">
      <SectionHeader
        icon={<UsersRound className="h-5 w-5" />}
        title="Role Health"
        subtitle="Availability and score by workforce group"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((item) => (
          <article key={item.role} className="rounded-2xl border border-[#eef2f7] bg-[#fbfdff] p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge value={item.role} type="role" />
              <div className="text-sm font-bold tabular-nums text-slate-900">{safeNumber(item.total)} total</div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Present</div>
                <div className="mt-1 text-lg font-bold text-emerald-600">{safeNumber(item.present)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Absent</div>
                <div className="mt-1 text-lg font-bold text-rose-600">{safeNumber(item.absent)}</div>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                <span>Utilization</span>
                <span>{safeNumber(item.utilizationPercent)}%</span>
              </div>
              <ProgressBar value={item.utilizationPercent} color="bg-cyan-500" />
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                <span>Avg. score</span>
                <span>{safeNumber(item.averagePerformanceScore)}</span>
              </div>
              <ProgressBar value={item.averagePerformanceScore} color="bg-blue-500" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PersonList({ title, subtitle, icon, items, emptyText, attention = false }) {
  return (
    <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={`${item.role}-${item._id}`} className="rounded-2xl border border-[#eef2f7] bg-[#fbfdff] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">{item.name || "Unnamed"}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge value={item.role} type="role" />
                    <Badge value={item.attendanceStatus} type="status" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold tabular-nums text-slate-900">{safeNumber(item.performanceScore)}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Score</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-500">
                {attention ? item.reason : `${item.department || "Unassigned"} - workload ${safeNumber(item.workloadCount)}`}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f8fbff] px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      )}
    </section>
  );
}

export default function StaffPerformance() {
  const { getToken } = useAuth();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [day, setDay] = useState("All Days");
  const [role, setRole] = useState("All Roles");
  const [department, setDepartment] = useState("All Departments");
  const [shiftType, setShiftType] = useState("All Shifts");
  const [status, setStatus] = useState("All Statuses");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [performanceData, setPerformanceData] = useState(null);

  const filters = useMemo(
    () => ({ year, month, day, role, department, shiftType, status }),
    [day, department, month, role, shiftType, status, year],
  );

  useEffect(() => {
    let mounted = true;

    async function loadPerformance() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchPerformanceSummary(filters, getToken);
        if (mounted) setPerformanceData(data);
      } catch (err) {
        console.error("Performance fetch error:", err);
        if (mounted) {
          setError("Unable to load performance data. Please try again.");
          setPerformanceData(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPerformance();

    return () => {
      mounted = false;
    };
  }, [filters, getToken]);

  const overview = performanceData?.overview || {};
  const records = useMemo(
    () => (Array.isArray(performanceData?.records) ? performanceData.records : []),
    [performanceData],
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      [record.name, record.role, record.department, record.shiftType, record.email, record.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [records, search]);

  const departmentOptions = useMemo(() => {
    const departments = new Set(records.map((record) => record.department).filter(Boolean));
    if (department && department !== "All Departments") departments.add(department);
    return ["All Departments", ...Array.from(departments).sort()];
  }, [department, records]);

  const roleHealth = performanceData?.roleBreakdown || [];
  const attendanceItems = [
    { label: "Present", value: overview.presentCount, color: "bg-emerald-500" },
    { label: "Absent", value: overview.absentCount, color: "bg-rose-500" },
    { label: "Late", value: overview.lateCount, color: "bg-amber-500" },
    { label: "On Leave", value: overview.onLeaveCount, color: "bg-sky-500" },
  ];
  const shiftItems = (performanceData?.shiftDistribution || []).map((item, index) => ({
    label: item.shiftType,
    value: item.count,
    color: ["bg-blue-500", "bg-cyan-500", "bg-indigo-500", "bg-violet-500", "bg-slate-400"][index] || "bg-blue-500",
  }));
  const departmentItems = (performanceData?.departmentUtilization || [])
    .slice()
    .sort((a, b) => safeNumber(b.total) - safeNumber(a.total))
    .slice(0, 6)
    .map((item) => ({
      label: item.department,
      value: item.utilizationPercent,
      color: "bg-gradient-to-r from-[#2563eb] to-[#06b6d4]",
    }));
  const trendItems = (performanceData?.attendanceTrend || []).slice(-7).map((item) => ({
    label: item.label,
    value: safeNumber(item.present) + safeNumber(item.late) + safeNumber(item.onLeave),
    color: "bg-emerald-500",
  }));

  return (
    <AdminLayout
      title="Performance"
      subtitle="Monitor doctors, nurses, and staff attendance, workload, utilization, and performance."
    >
      <div className="space-y-7">
        <section className="rounded-3xl border border-[#dbe6f7] bg-[#eef4fb] p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#dbe6f7]">
                <CalendarCheck2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Performance Command Center
                </h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                  A live operational view of workforce availability, attendance,
                  workload, and performance across clinical and support teams.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm">
              {loading ? "Loading performance data..." : `${safeNumber(overview.totalPeople)} people in view`}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <OverviewCard
              label="Total Workforce"
              value={safeNumber(overview.totalPeople)}
              helper={`${safeNumber(overview.totalDoctors)} doctors, ${safeNumber(overview.totalNurses)} nurses, ${safeNumber(overview.totalStaff)} staff`}
              icon={<UsersRound className="h-6 w-6 text-blue-600" />}
              tone="bg-blue-50"
              wide
            />
            <OverviewCard
              label="Present"
              value={safeNumber(overview.presentCount)}
              helper={`${safeNumber(overview.absentCount)} absent, ${safeNumber(overview.lateCount)} late`}
              icon={<UserCheck className="h-6 w-6 text-emerald-600" />}
              tone="bg-emerald-50"
            />
            <OverviewCard
              label="Utilization"
              value={`${safeNumber(overview.overallUtilizationPercent)}%`}
              helper="Present workforce against total selected people"
              icon={<Activity className="h-6 w-6 text-cyan-600" />}
              tone="bg-cyan-50"
            />
            <OverviewCard
              label="Avg. Score"
              value={safeNumber(overview.averagePerformanceScore)}
              helper="Attendance weighted with real workload"
              icon={<TrendingUp className="h-6 w-6 text-indigo-600" />}
              tone="bg-indigo-50"
            />
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader
              icon={<Filter className="h-5 w-5" />}
              title="Filters"
              subtitle="Start with date, then narrow by role or operating area"
            />
            <button
              type="button"
              onClick={() => {
                setDay("All Days");
                setRole("All Roles");
                setDepartment("All Departments");
                setShiftType("All Shifts");
                setStatus("All Statuses");
                setSearch("");
              }}
              className="h-11 rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              Reset filters
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
            <FilterSelect label="Year" value={year} onChange={setYear} options={filterOptions.years} />
            <FilterSelect label="Month" value={month} onChange={setMonth} options={filterOptions.months} />
            <FilterSelect label="Day" value={day} onChange={setDay} options={filterOptions.days} />
            <FilterSelect label="Role" value={role} onChange={setRole} options={filterOptions.roles} />
            <FilterSelect label="Department" value={department} onChange={setDepartment} options={departmentOptions} />
            <FilterSelect label="Shift" value={shiftType} onChange={setShiftType} options={filterOptions.shifts} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={filterOptions.statuses} />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-3">
          <RoleHealth roles={roleHealth} />
          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Attendance Snapshot"
              subtitle="Current status mix for selected filters"
            />
            <BarList items={attendanceItems} />
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<Clock3 className="h-5 w-5" />}
              title="Shift Coverage"
              subtitle="Workforce distribution by shift"
            />
            <BarList items={shiftItems} />
          </section>
          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<BarChart3 className="h-5 w-5" />}
              title="Department Utilization"
              subtitle="Top departments by selected utilization"
            />
            <BarList items={departmentItems} valueSuffix="%" emptyText="No department utilization yet." />
          </section>
          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<TrendingUp className="h-5 w-5" />}
              title="Attendance Trend"
              subtitle="Recent attended, late, and leave entries"
            />
            <BarList items={trendItems} emptyText="No attendance trend records yet." color="bg-emerald-500" />
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <PersonList
            title="Top Performers"
            subtitle="Highest calculated scores from real attendance and workload"
            icon={<TrendingUp className="h-5 w-5" />}
            items={performanceData?.topPerformers || []}
            emptyText="No top performers match the selected filters."
          />
          <PersonList
            title="Needs Attention"
            subtitle="Absent, late, or low-scoring workforce members"
            icon={<AlertTriangle className="h-5 w-5" />}
            items={performanceData?.attentionNeeded || []}
            emptyText="No attention items match the selected filters."
            attention
          />
        </div>

        <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#eef2f7] px-6 py-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[1.55rem] font-bold tracking-tight text-slate-900">
                Performance Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Unified, searchable records for doctors, nurses, and staff
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search records"
                  className="h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white sm:w-64"
                />
              </label>
              <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-slate-600">
                {loading ? "Loading records..." : `${filteredRecords.length} shown`}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1060px]">
              <thead className="bg-[#f8fbff]">
                <tr className="text-left">
                  {["Name", "Role", "Department", "Shift", "Attendance", "Workload", "Utilization", "Score", "Contact"].map((heading) => (
                    <th key={heading} className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                      Loading performance data...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredRecords.map((record) => (
                  <tr key={`${record.role}-${record._id}`} className="border-t border-[#eef2f7] transition hover:bg-[#f8fbff]">
                    <td className="px-5 py-4">
                      <div className="text-sm font-bold text-slate-900">{record.name || "Unnamed"}</div>
                      <div className="mt-1 text-xs text-slate-400">{record._id}</div>
                    </td>
                    <td className="px-5 py-4"><Badge value={record.role} type="role" /></td>
                    <td className="px-5 py-4 text-sm text-slate-600">{record.department || "Unassigned"}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-blue-700">{record.shiftType || "Unassigned"}</td>
                    <td className="px-5 py-4"><Badge value={record.attendanceStatus} type="status" /></td>
                    <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-700">{safeNumber(record.workloadCount)}</td>
                    <td className="px-5 py-4">
                      <div className="w-28">
                        <div className="mb-1 text-xs font-bold tabular-nums text-slate-700">{safeNumber(record.utilizationPercent)}%</div>
                        <ProgressBar value={record.utilizationPercent} color="bg-cyan-500" />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-32">
                        <div className="mb-1 text-xs font-bold tabular-nums text-slate-700">{safeNumber(record.performanceScore)}</div>
                        <ProgressBar value={record.performanceScore} color="bg-blue-500" />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <div>{record.email || "-"}</div>
                      <div className="mt-1 text-xs text-slate-400">{record.phone || "-"}</div>
                    </td>
                  </tr>
                ))}

                {!loading && !filteredRecords.length && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                      No performance records match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
