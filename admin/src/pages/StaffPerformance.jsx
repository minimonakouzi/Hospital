import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Filter,
  HeartPulse,
  Stethoscope,
  UserCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import {
  fetchStaffPerformanceRecords,
  fetchStaffPerformanceSummary,
} from "../api/staffPerformanceApi";

const filterOptions = {
  years: ["2026", "2025"],
  months: ["May", "April", "March", "February", "January"],
  days: ["All Days", "02", "01", "31", "30", "29"],
  departments: [
    "All Departments",
    "Admissions",
    "Cardiology",
    "Emergency",
    "ICU",
    "Laboratory",
    "Neurology",
    "Pediatrics",
    "Radiology",
    "Surgery",
  ],
  shifts: ["All Shifts", "Morning", "Evening", "Night"],
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricCard({ icon, label, value, tone = "bg-blue-50" }) {
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex min-h-[92px] items-stretch gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-2xl ${tone}`}
        >
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="min-h-[32px] text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </div>
          <div className="text-[2rem] font-bold leading-none tabular-nums text-slate-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AttendanceBadge({ status }) {
  const present = status === "Present";
  const Icon = present ? CheckCircle2 : XCircle;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
        present
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-rose-50 text-rose-700 ring-rose-100"
      }`}
    >
      <Icon className="h-4 w-4" />
      {status}
    </span>
  );
}

function ChartCard({ title, subtitle, icon, items, valueSuffix = "" }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-blue-600">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="font-bold tabular-nums text-slate-900">
                {item.value}
                {valueSuffix}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#eef4fb]">
              <div
                className={`h-full rounded-full ${item.color}`}
                style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function chartItemsFromObject(source = {}, labels = [], colors = []) {
  return labels.map((label, index) => ({
    label,
    value: Number(source?.[label] || 0),
    color: colors[index] || "bg-blue-500",
  }));
}

export default function StaffPerformance() {
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("May");
  const [day, setDay] = useState("All Days");
  const [department, setDepartment] = useState("All Departments");
  const [shift, setShift] = useState("All Shifts");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeFilters = useMemo(() => {
    return {
      year,
      month,
      day,
      department,
      shift,
    };
  }, [day, department, month, shift, year]);

  useEffect(() => {
    let mounted = true;

    async function loadStaffPerformance() {
      try {
        setLoading(true);
        setError("");

        const [recordsData, summaryData] = await Promise.all([
          fetchStaffPerformanceRecords(activeFilters),
          fetchStaffPerformanceSummary(activeFilters),
        ]);

        if (!mounted) return;
        setRecords(recordsData);
        setSummary(summaryData);
      } catch (err) {
        console.error("Staff performance fetch error:", err);
        if (mounted) {
          setError(
            err?.message || "Unable to load staff performance records.",
          );
          setRecords([]);
          setSummary(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStaffPerformance();

    return () => {
      mounted = false;
    };
  }, [activeFilters]);

  const filteredRecords = records;

  const analytics = useMemo(() => {
    return {
      totalStaff: summary?.totalStaff || 0,
      doctors: summary?.doctors || 0,
      nurses: summary?.nurses || 0,
      staff: summary?.staff || 0,
      present: summary?.staffPresent || 0,
      utilization: summary?.utilization || 0,
      shiftChart: chartItemsFromObject(
        summary?.staffByShift,
        ["Morning", "Evening", "Night"],
        ["bg-blue-500", "bg-cyan-500", "bg-indigo-500"],
      ),
      roleChart: chartItemsFromObject(
        summary?.staffPresentByRole,
        ["Doctor", "Nurse", "Staff"],
        ["bg-blue-500", "bg-emerald-500", "bg-cyan-500"],
      ),
      departmentChart: Array.isArray(summary?.utilizationByDepartment)
        ? summary.utilizationByDepartment.map((item) => ({
            label: item.department,
            value: Number(item.utilization || 0),
            color: "bg-gradient-to-r from-[#2563eb] to-[#06b6d4]",
          }))
        : [],
    };
  }, [summary]);

  const metrics = [
    {
      label: "Total Staff",
      value: analytics.totalStaff,
      icon: <UsersRound className="h-6 w-6 text-blue-600" />,
      tone: "bg-blue-50",
    },
    {
      label: "Number of Doctors",
      value: analytics.doctors,
      icon: <Stethoscope className="h-6 w-6 text-indigo-600" />,
      tone: "bg-indigo-50",
    },
    {
      label: "Number of Nurses",
      value: analytics.nurses,
      icon: <HeartPulse className="h-6 w-6 text-cyan-600" />,
      tone: "bg-cyan-50",
    },
    {
      label: "Staff Present",
      value: analytics.present,
      icon: <UserCheck className="h-6 w-6 text-emerald-600" />,
      tone: "bg-emerald-50",
    },
    {
      label: "Staff Utilization %",
      value: `${analytics.utilization}%`,
      icon: <Activity className="h-6 w-6 text-teal-600" />,
      tone: "bg-teal-50",
    },
  ];

  return (
    <AdminLayout
      title="Staff Performance"
      subtitle="Monitor workforce availability, attendance, and utilization"
    >
      <div className="space-y-7">
        <section className="rounded-3xl border border-[#dbe6f7] bg-[#eef4fb] p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#dbe6f7]">
                <CalendarCheck2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Workforce Overview
                </h2>
                <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-600">
                  The Staff Performance Dashboard provides a clear overview of
                  hospital workforce availability, attendance, and utilization. It
                  displays key metrics such as total staff count, number of doctors
                  and nurses, staff attendance, and overall utilization percentage.
                  It also includes detailed staff records showing each member's
                  role, department, shift type, and attendance status. By
                  visualizing staff utilization by department and shift type, this
                  dashboard helps hospital managers monitor workforce efficiency,
                  identify staffing gaps, and make better resource allocation
                  decisions.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metrics.map((item) => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Filters</h2>
              <p className="text-sm text-slate-500">
                Refine staff analytics by date, department, and shift
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label="Year"
              value={year}
              onChange={setYear}
              options={filterOptions.years}
            />
            <FilterSelect
              label="Month"
              value={month}
              onChange={setMonth}
              options={filterOptions.months}
            />
            <FilterSelect
              label="Day"
              value={day}
              onChange={setDay}
              options={filterOptions.days}
            />
            <FilterSelect
              label="Department Name"
              value={department}
              onChange={setDepartment}
              options={filterOptions.departments}
            />
            <FilterSelect
              label="Shift Type"
              value={shift}
              onChange={setShift}
              options={filterOptions.shifts}
            />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-3">
          <ChartCard
            title="Number of Staff by Shift Type"
            subtitle="Coverage distribution across daily shifts"
            icon={<Clock3 className="h-5 w-5" />}
            items={analytics.shiftChart}
          />
          <ChartCard
            title="Staff Present by Role"
            subtitle="Available team members by clinical role"
            icon={<UserCheck className="h-5 w-5" />}
            items={analytics.roleChart}
          />
          <ChartCard
            title="Staff Utilization by Department"
            subtitle="Average utilization for active departments"
            icon={<Activity className="h-5 w-5" />}
            items={
              analytics.departmentChart.length
                ? analytics.departmentChart
                : [
                    {
                      label: "No matching records",
                      value: 0,
                      color: "bg-slate-300",
                    },
                  ]
            }
            valueSuffix="%"
          />
        </div>

        <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#eef2f7] px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[1.65rem] font-bold tracking-tight text-slate-900">
                Staff Attendance Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Daily roster details for attendance and shift coverage
              </p>
            </div>
            <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-slate-600">
              {loading ? "Loading records..." : `Showing ${filteredRecords.length} records`}
            </div>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full">
              <thead className="bg-[#f8fbff]">
                <tr className="text-left">
                  {[
                    "Date",
                    "Staff ID",
                    "Staff Name",
                    "Role",
                    "Department",
                    "Shift",
                    "Attendance",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      Loading staff performance records...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredRecords.map((record) => (
                  <tr
                    key={record._id || `${record.staffId}-${record.date}`}
                    className="border-t border-[#eef2f7] transition hover:bg-[#f8fbff]"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                      {record.staffId}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {record.staffName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {record.role}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {record.department}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-xl bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                        {record.shift}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <AttendanceBadge status={record.attendance} />
                    </td>
                  </tr>
                ))}
                {!loading && !filteredRecords.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No staff records match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 p-4 lg:hidden">
            {loading ? (
              <div className="rounded-3xl border border-[#dbe6f7] bg-white p-6 text-center text-sm text-slate-500">
                Loading staff performance records...
              </div>
            ) : filteredRecords.length ? (
              filteredRecords.map((record) => (
                <article
                  key={record._id || `${record.staffId}-${record.date}`}
                  className="rounded-3xl border border-[#dbe6f7] bg-[#fbfdff] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-slate-900">
                        {record.staffName}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-blue-700">
                        {record.staffId}
                      </div>
                    </div>
                    <AttendanceBadge status={record.attendance} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#f8fbff] p-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Date
                      </div>
                      <div className="mt-1 font-semibold text-slate-700">
                        {formatDate(record.date)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Role
                      </div>
                      <div className="mt-1 font-semibold text-slate-700">
                        {record.role}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Department
                      </div>
                      <div className="mt-1 font-semibold text-slate-700">
                        {record.department}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Shift
                      </div>
                      <div className="mt-1 font-semibold text-slate-700">
                        {record.shift}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-[#f8fbff] px-4 py-10 text-center text-sm text-slate-500">
                No staff records match the selected filters.
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
