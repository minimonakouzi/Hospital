import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api`;
const DOCTOR_TOKEN_KEY = "doctorToken_v1";

function authHeaders(headers = {}) {
  const token = localStorage.getItem(DOCTOR_TOKEN_KEY);
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

function itemId(item = {}) {
  return item?._id || item?.id || "";
}

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

function patientName(patient = {}) {
  if (!patient || typeof patient !== "object") return "Unknown patient";
  return patient.fullName || patient.name || patient.phone || patient.email || patient.patientCode || `Patient ${String(itemId(patient)).slice(-6)}`;
}

function patientCode(patient = {}) {
  return patient?.patientCode || "";
}

function nurseLabel(nurse = {}) {
  if (!nurse || typeof nurse !== "object") return "Unassigned";
  return [nurse.name || nurse.email || "Nurse", nurse.nurseCode].filter(Boolean).join(" - ");
}

function condition(admission = {}) {
  return admission.latestNursingNote?.patientCondition || "Stable";
}

function conditionTone(value = "") {
  if (value === "Critical") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (value === "Needs Attention") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (value === "Improving") return "bg-blue-50 text-blue-700 ring-blue-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function statusTone(value = "") {
  if (value === "Discharged") return "bg-slate-100 text-slate-600 ring-slate-200";
  if (value === "Transferred") return "bg-blue-50 text-blue-700 ring-blue-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function Badge({ value, tone }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone(value)}`}>
      {value || "Stable"}
    </span>
  );
}

function MetricCard({ title, value, icon, tint }) {
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{value ?? 0}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-[#0f172a] outline-none transition focus:border-blue-300 focus:bg-white";

function Modal({ admission, onClose }) {
  const notes = Array.isArray(admission.nursingNotes) ? admission.nursingNotes : [];
  const transfers = Array.isArray(admission.transferHistory) ? admission.transferHistory : [];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">Admission Details</h2>
            <p className="mt-1 text-sm text-[#64748b]">{patientName(admission.patientId)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Ward / Room / Bed" value={`${admission.wardId?.wardName || "-"} / Room ${admission.roomId?.roomNumber || "-"} / Bed ${admission.bedId?.bedNumber || "-"}`} icon={<BedDouble className="h-4 w-4" />} />
            <Detail label="Patient ID" value={patientCode(admission.patientId) || "Pending"} icon={<UserRound className="h-4 w-4" />} />
            <Detail label="Assigned Nurse" value={nurseLabel(admission.nurseId)} icon={<UserRound className="h-4 w-4" />} />
            <Detail label="Admission Date" value={formatDate(admission.admissionDate)} icon={<CalendarDays className="h-4 w-4" />} />
            <Detail label="Expected Discharge" value={formatDate(admission.expectedDischargeDate)} icon={<CalendarDays className="h-4 w-4" />} />
            <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">Admission Reason</p>
              <p className="mt-2 text-sm leading-6 text-[#334155]">{admission.reasonForAdmission || "-"}</p>
              {admission.notes ? <p className="mt-2 text-sm leading-6 text-[#64748b]">{admission.notes}</p> : null}
            </div>
            <HistoryBlock title="Transfer History" items={transfers} empty="No transfers recorded." />
            <NotesBlock notes={notes} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
        <span className="text-[#2563eb]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-[#0f172a]">{value || "-"}</p>
    </div>
  );
}

function HistoryBlock({ title, items, empty }) {
  return (
    <div className="rounded-2xl border border-[#dbe6f7] bg-white p-4 md:col-span-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">{title}</p>
      {!items.length ? (
        <p className="mt-3 text-sm text-[#64748b]">{empty}</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <div key={`${item.transferDate}-${index}`} className="rounded-2xl bg-[#f8fbff] p-3 text-sm text-[#334155]">
              {formatDate(item.transferDate)}: {item.fromWardId?.wardName || "-"} / Room {item.fromRoomId?.roomNumber || "-"} / Bed {item.fromBedId?.bedNumber || "-"} to {item.toWardId?.wardName || "-"} / Room {item.toRoomId?.roomNumber || "-"} / Bed {item.toBedId?.bedNumber || "-"}
              {item.transferReason ? <p className="mt-1 text-xs text-[#64748b]">{item.transferReason}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesBlock({ notes }) {
  return (
    <div className="rounded-2xl border border-[#dbe6f7] bg-white p-4 md:col-span-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">Nursing Notes</p>
      {!notes.length ? (
        <p className="mt-3 text-sm text-[#64748b]">No nursing notes recorded.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {notes.map((note) => (
            <article key={itemId(note)} className="rounded-2xl bg-[#f8fbff] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-[#0f172a]">{note.noteTitle || "Nursing note"}</p>
                  <p className="mt-1 text-xs text-[#64748b]">{formatDate(note.createdAt)}</p>
                </div>
                <Badge value={note.patientCondition} tone={conditionTone} />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#334155]">{note.noteDescription || "-"}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdmittedPatients() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    ward: "",
    room: "",
    condition: "",
  });

  const loadAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/admissions/doctor`, {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Unable to load admitted patients. Please try again.");
      }

      setAdmissions(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error("load doctor admitted patients error:", err);
      setAdmissions([]);
      setError(err?.message || "Unable to load admitted patients. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmissions();
  }, [loadAdmissions]);

  const wardOptions = useMemo(
    () => [...new Set(admissions.map((item) => item.wardId?.wardName).filter(Boolean))].sort(),
    [admissions],
  );

  const roomOptions = useMemo(
    () => [...new Set(admissions.map((item) => item.roomId?.roomNumber).filter(Boolean))].sort(),
    [admissions],
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return admissions
      .filter((item) => (filters.status ? item.status === filters.status : true))
      .filter((item) => (filters.ward ? item.wardId?.wardName === filters.ward : true))
      .filter((item) => (filters.room ? item.roomId?.roomNumber === filters.room : true))
      .filter((item) => (filters.condition ? condition(item) === filters.condition : true))
      .filter((item) => {
        if (!q) return true;
        return [
          patientName(item.patientId),
          item.patientId?.patientCode,
          item.nurseId?.name,
          item.nurseId?.nurseCode,
          item.wardId?.wardName,
          item.roomId?.roomNumber,
          item.bedId?.bedNumber,
          item.reasonForAdmission,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [admissions, filters]);

  const metrics = useMemo(() => {
    const active = admissions.filter((item) => item.status !== "Discharged").length;
    const discharged = admissions.filter((item) => item.status === "Discharged").length;
    const attention = admissions.filter((item) => ["Critical", "Needs Attention"].includes(condition(item))).length;
    const now = new Date();
    const upcoming = admissions.filter((item) => {
      if (!item.expectedDischargeDate || item.status === "Discharged") return false;
      const date = new Date(item.expectedDischargeDate);
      if (Number.isNaN(date.getTime())) return false;
      const diff = date.getTime() - now.getTime();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { active, discharged, attention, upcoming };
  }, [admissions]);

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc]">
      <div className="border-b border-[#dbe6f7] bg-white/95 px-4 py-5 shadow-[0_1px_0_rgba(15,23,42,0.02)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
              Doctor / Admitted Patients
            </p>
            <div className="mb-2 h-1 w-10 rounded-full bg-[#2563eb]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] sm:text-[1.7rem]">
              Admitted Patients
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#64748b]">
              View patients currently admitted under your care.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAdmissions}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-semibold text-[#2563eb] transition hover:bg-[#f8fbff]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Total Assigned" value={admissions.length} icon={<ClipboardList className="h-5 w-5" />} tint="bg-blue-50 text-blue-700" />
            <MetricCard title="Active" value={metrics.active} icon={<CheckCircle2 className="h-5 w-5" />} tint="bg-emerald-50 text-emerald-700" />
            <MetricCard title="Discharged" value={metrics.discharged} icon={<FileText className="h-5 w-5" />} tint="bg-slate-100 text-slate-600" />
            <MetricCard title="Critical / Attention" value={metrics.attention} icon={<AlertCircle className="h-5 w-5" />} tint="bg-amber-50 text-amber-700" />
            <MetricCard title="Expected Soon" value={metrics.upcoming} icon={<CalendarDays className="h-5 w-5" />} tint="bg-blue-50 text-blue-700" />
          </section>

          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_170px_170px_150px_190px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  className={`${inputClass} pl-11`}
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Search patient, nurse, ward, reason..."
                />
              </div>
              <select className={inputClass} value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="">All statuses</option>
                <option>Active</option>
                <option>Transferred</option>
                <option>Discharged</option>
              </select>
              <select className={inputClass} value={filters.ward} onChange={(e) => setFilters((prev) => ({ ...prev, ward: e.target.value }))}>
                <option value="">All wards</option>
                {wardOptions.map((ward) => <option key={ward}>{ward}</option>)}
              </select>
              <select className={inputClass} value={filters.room} onChange={(e) => setFilters((prev) => ({ ...prev, room: e.target.value }))}>
                <option value="">All rooms</option>
                {roomOptions.map((room) => <option key={room}>{room}</option>)}
              </select>
              <select className={inputClass} value={filters.condition} onChange={(e) => setFilters((prev) => ({ ...prev, condition: e.target.value }))}>
                <option value="">All conditions</option>
                <option>Stable</option>
                <option>Critical</option>
                <option>Improving</option>
                <option>Needs Attention</option>
              </select>
              <button
                type="button"
                onClick={() => setFilters({ search: "", status: "", ward: "", room: "", condition: "" })}
                className="h-11 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fbff]"
              >
                Clear
              </button>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-16 text-sm font-semibold text-[#2563eb]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading admitted patients...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-[#2563eb]">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-[#0f172a]">
                  No admitted patients assigned to you
                </h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  Admissions assigned to your doctor account will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 p-4">
                {filtered.map((admission) => (
                  <PatientCard key={itemId(admission)} admission={admission} onView={() => setSelected(admission)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {selected ? <Modal admission={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function PatientCard({ admission, onView }) {
  const currentCondition = condition(admission);

  return (
    <article className="rounded-3xl border border-[#dbe6f7] bg-[#fbfdff] p-4 transition hover:bg-white hover:shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr_1fr_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[#0f172a]">
                {patientName(admission.patientId)}
              </h3>
              {patientCode(admission.patientId) ? (
                <p className="mt-1 text-xs font-bold text-[#2563eb]">
                  {patientCode(admission.patientId)}
                </p>
              ) : null}
              <p className="mt-1 truncate text-sm font-semibold text-[#2563eb]">
                {admission.reasonForAdmission || "Admitted patient"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge value={currentCondition} tone={conditionTone} />
                <Badge value={admission.status} tone={statusTone} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 text-sm text-[#64748b]">
          <InfoLine icon={<Building2 className="h-4 w-4" />} label="Ward" value={admission.wardId?.wardName || "-"} />
          <InfoLine icon={<DoorOpen className="h-4 w-4" />} label="Room" value={admission.roomId?.roomNumber || "-"} />
          <InfoLine icon={<BedDouble className="h-4 w-4" />} label="Bed" value={admission.bedId?.bedNumber || "-"} />
        </div>

        <div className="grid gap-2 text-sm text-[#64748b]">
          <InfoLine icon={<UserRound className="h-4 w-4" />} label="Nurse" value={nurseLabel(admission.nurseId)} />
          <InfoLine icon={<CalendarDays className="h-4 w-4" />} label="Admission" value={formatDate(admission.admissionDate)} />
          <InfoLine icon={<CalendarDays className="h-4 w-4" />} label="Expected" value={formatDate(admission.expectedDischargeDate)} />
        </div>

        <div className="flex xl:justify-end">
          <button
            type="button"
            onClick={onView}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[#2563eb]">{icon}</span>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.1em] text-[#94a3b8]">{label}</span>
      <span className="min-w-0 truncate font-semibold text-[#334155]">{value || "-"}</span>
    </div>
  );
}
