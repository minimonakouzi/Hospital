import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import {
  EmptyState,
  MetricCard,
  PageBody,
  PageHeader,
  SectionCard,
} from "../../nurse/shared/NurseUi";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api`;
const NURSE_TOKEN_KEY = "nurseToken_v1";
const CONDITIONS = ["Stable", "Critical", "Improving", "Needs Attention"];
const BED_STATUS_OPTIONS = ["Available", "Maintenance"];

function authHeaders(headers = {}) {
  const token = localStorage.getItem(NURSE_TOKEN_KEY);
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

function conditionTone(condition = "") {
  if (condition === "Critical") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (condition === "Needs Attention") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (condition === "Improving") return "bg-blue-50 text-blue-700 ring-blue-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function statusTone(status = "") {
  if (status === "Occupied" || status === "Transferred") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "Cleaning") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "Maintenance") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function Badge({ value, tone }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone(value)}`}>
      {value || "Stable"}
    </span>
  );
}

function Notice({ message, onClose }) {
  if (!message.text) return null;
  const success = message.type === "success";
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        success
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-rose-100 bg-rose-50 text-rose-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {success ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
        {message.text}
      </div>
      <button type="button" onClick={onClose}>
        <X className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-[#0f172a] outline-none transition focus:border-blue-300 focus:bg-white";

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function NurseWardPatients() {
  const [patients, setPatients] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    condition: "",
    status: "",
    ward: "",
    bedStatus: "",
  });
  const [noteForm, setNoteForm] = useState({
    noteTitle: "",
    noteDescription: "",
    patientCondition: "Stable",
  });
  const [bedStatus, setBedStatus] = useState("");

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const res = await fetch(`${API_BASE}/admissions/nurse`, {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Unable to load ward patients. Please try again.");
      }

      setPatients(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error("load ward patients error:", err);
      setPatients([]);
      setMessage({
        type: "error",
        text: err?.message || "Unable to load ward patients. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  async function loadNotes(admission) {
    try {
      setNotesLoading(true);
      setNotes([]);
      const res = await fetch(`${API_BASE}/admissions/${itemId(admission)}/nursing-notes`, {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "Unable to load nursing notes.");
      }
      setNotes(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error("load nursing notes error:", err);
      setNotes([]);
      setMessage({ type: "error", text: err?.message || "Unable to load nursing notes." });
    } finally {
      setNotesLoading(false);
    }
  }

  function openNotes(admission) {
    setModal({ type: "notes", admission });
    setNoteForm({ noteTitle: "", noteDescription: "", patientCondition: "Stable" });
    loadNotes(admission);
  }

  function openBedStatus(admission) {
    const current = admission.bedId?.bedStatus || "";
    setModal({ type: "bed", admission });
    setBedStatus(allowedBedStatuses(current)[0] || "");
  }

  async function submitNote(event) {
    event.preventDefault();
    if (!modal?.admission) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/admissions/${itemId(modal.admission)}/nursing-notes`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(noteForm),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "Unable to add nursing note.");
      }
      setMessage({ type: "success", text: body?.message || "Nursing note added successfully." });
      setNoteForm({ noteTitle: "", noteDescription: "", patientCondition: "Stable" });
      await loadNotes(modal.admission);
      await loadPatients();
    } catch (err) {
      console.error("submit nursing note error:", err);
      setMessage({ type: "error", text: err?.message || "Unable to add nursing note." });
    } finally {
      setSaving(false);
    }
  }

  async function submitBedStatus(event) {
    event.preventDefault();
    if (!modal?.admission || !bedStatus) return;

    try {
      setSaving(true);
      const bedId = itemId(modal.admission.bedId);
      const res = await fetch(`${API_BASE}/admissions/beds/${bedId}/status`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ bedStatus }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "Unable to update bed status.");
      }
      setModal(null);
      setMessage({ type: "success", text: body?.message || "Bed status updated successfully." });
      await loadPatients();
    } catch (err) {
      console.error("update bed status error:", err);
      setMessage({ type: "error", text: err?.message || "Unable to update bed status." });
    } finally {
      setSaving(false);
    }
  }

  const wardOptions = useMemo(
    () => [...new Set(patients.map((item) => item.wardId?.wardName).filter(Boolean))].sort(),
    [patients],
  );

  const filteredPatients = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return patients
      .filter((item) => (filters.condition ? latestCondition(item) === filters.condition : true))
      .filter((item) => (filters.status ? item.status === filters.status : true))
      .filter((item) => (filters.ward ? item.wardId?.wardName === filters.ward : true))
      .filter((item) => (filters.bedStatus ? item.bedId?.bedStatus === filters.bedStatus : true))
      .filter((item) => {
        if (!q) return true;
        return [
          item.patientId?.patientCode,
          patientName(item.patientId),
          item.doctorId?.name,
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
  }, [filters, patients]);

  const metrics = useMemo(() => {
    const critical = patients.filter((item) => latestCondition(item) === "Critical").length;
    const attention = patients.filter((item) => latestCondition(item) === "Needs Attention").length;
    const stable = patients.filter((item) => ["Stable", "Improving"].includes(latestCondition(item))).length;
    const occupiedBeds = patients.filter((item) => item.bedId?.bedStatus === "Occupied").length;
    return { critical, attention, stable, occupiedBeds };
  }, [patients]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        eyebrow="Ward Patients"
        title="Assigned Ward Patients"
        subtitle="Monitor admitted patients assigned to you and record nursing care notes."
        action={
          <button
            type="button"
            onClick={loadPatients}
            className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-white px-4 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#f8fbff]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Assigned Patients" value={patients.length} icon={<UserRound className="h-5 w-5" />} tint="bg-blue-50 text-blue-700" />
          <MetricCard title="Critical" value={metrics.critical} icon={<AlertCircle className="h-5 w-5" />} tint="bg-rose-50 text-rose-700" />
          <MetricCard title="Needs Attention" value={metrics.attention} icon={<ClipboardList className="h-5 w-5" />} tint="bg-amber-50 text-amber-700" />
          <MetricCard title="Stable / Improving" value={metrics.stable} icon={<CheckCircle2 className="h-5 w-5" />} tint="bg-emerald-50 text-emerald-700" />
          <MetricCard title="Occupied Beds" value={metrics.occupiedBeds} icon={<BedDouble className="h-5 w-5" />} tint="bg-blue-50 text-blue-700" />
        </div>

        <SectionCard icon={<Search className="h-5 w-5" />} title="Filters" subtitle="Search assigned admissions by care context">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_190px_170px_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search patient, ward, room, bed..."
              />
            </div>
            <select className={inputClass} value={filters.condition} onChange={(e) => setFilters((prev) => ({ ...prev, condition: e.target.value }))}>
              <option value="">All conditions</option>
              {CONDITIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option>Active</option>
              <option>Transferred</option>
            </select>
            <select className={inputClass} value={filters.ward} onChange={(e) => setFilters((prev) => ({ ...prev, ward: e.target.value }))}>
              <option value="">All wards</option>
              {wardOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className={inputClass} value={filters.bedStatus} onChange={(e) => setFilters((prev) => ({ ...prev, bedStatus: e.target.value }))}>
              <option value="">All beds</option>
              <option>Occupied</option>
              <option>Cleaning</option>
              <option>Available</option>
              <option>Maintenance</option>
            </select>
            <button
              type="button"
              onClick={() => setFilters({ search: "", condition: "", status: "", ward: "", bedStatus: "" })}
              className="h-11 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fbff]"
            >
              Clear
            </button>
          </div>
        </SectionCard>

        <Notice message={message} onClose={() => setMessage({ type: "", text: "" })} />

        <SectionCard icon={<ClipboardList className="h-5 w-5" />} title="Assigned Patients" subtitle={`${filteredPatients.length} patient${filteredPatients.length === 1 ? "" : "s"}`}>
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] px-4 py-12 text-sm font-semibold text-[#2563eb]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading ward patients...
            </div>
          ) : filteredPatients.length ? (
            <div className="grid gap-4">
              {filteredPatients.map((admission) => (
                <PatientCard
                  key={itemId(admission)}
                  admission={admission}
                  onNotes={() => openNotes(admission)}
                  onBedStatus={() => openBedStatus(admission)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No assigned ward patients found"
              message="Patients admitted and assigned to your nurse account will appear here."
            />
          )}
        </SectionCard>
      </PageBody>

      {modal?.type === "notes" ? (
        <NotesModal
          admission={modal.admission}
          notes={notes}
          loading={notesLoading}
          saving={saving}
          form={noteForm}
          onChange={(field, value) => setNoteForm((prev) => ({ ...prev, [field]: value }))}
          onClose={() => setModal(null)}
          onSubmit={submitNote}
        />
      ) : null}

      {modal?.type === "bed" ? (
        <BedStatusModal
          admission={modal.admission}
          value={bedStatus}
          saving={saving}
          onChange={setBedStatus}
          onClose={() => setModal(null)}
          onSubmit={submitBedStatus}
        />
      ) : null}
    </div>
  );
}

function latestCondition(admission = {}) {
  return admission.latestNursingNote?.patientCondition || "Stable";
}

function allowedBedStatuses(current = "") {
  if (current === "Cleaning") return ["Available"];
  if (current === "Available") return ["Maintenance"];
  if (current === "Maintenance") return ["Available"];
  return [];
}

function PatientCard({ admission, onNotes, onBedStatus }) {
  const condition = latestCondition(admission);
  const bedStatus = admission.bedId?.bedStatus || "";
  const canUpdateBed = allowedBedStatuses(bedStatus).length > 0;

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
                <Badge value={condition} tone={conditionTone} />
                <Badge value={admission.status} tone={statusTone} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 text-sm text-[#64748b]">
          <InfoLine icon={<Stethoscope className="h-4 w-4" />} label="Doctor" value={admission.doctorId?.name || "Unassigned"} />
          <InfoLine icon={<UserRound className="h-4 w-4" />} label="Nurse" value={nurseLabel(admission.nurseId)} />
          <InfoLine icon={<Building2 className="h-4 w-4" />} label="Ward" value={admission.wardId?.wardName || "-"} />
          <InfoLine icon={<DoorOpen className="h-4 w-4" />} label="Room / Bed" value={`Room ${admission.roomId?.roomNumber || "-"} / Bed ${admission.bedId?.bedNumber || "-"}`} />
        </div>

        <div className="grid gap-2 text-sm text-[#64748b]">
          <InfoLine icon={<CalendarDays className="h-4 w-4" />} label="Admission" value={formatDate(admission.admissionDate)} />
          <InfoLine icon={<CalendarDays className="h-4 w-4" />} label="Expected discharge" value={formatDate(admission.expectedDischargeDate)} />
          <InfoLine icon={<BedDouble className="h-4 w-4" />} label="Bed status" value={bedStatus || "-"} />
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onNotes}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            <FileText className="h-4 w-4" />
            Notes
          </button>
          {canUpdateBed ? (
            <button
              type="button"
              onClick={onBedStatus}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-semibold text-[#2563eb] transition hover:bg-[#f8fbff]"
            >
              <BedDouble className="h-4 w-4" />
              Bed Status
            </button>
          ) : null}
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

function NotesModal({ admission, notes, loading, saving, form, onChange, onClose, onSubmit }) {
  return (
    <Modal title="Nursing Notes" subtitle={patientName(admission.patientId)} onClose={onClose}>
      <div className="max-h-[78vh] overflow-y-auto">
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
            <h3 className="font-bold text-[#0f172a]">Note History</h3>
            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="flex items-center text-sm font-semibold text-[#2563eb]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading notes...
                </div>
              ) : notes.length ? (
                notes.map((note) => (
                  <article key={itemId(note)} className="rounded-2xl bg-white p-3 ring-1 ring-[#e2e8f0]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#0f172a]">{note.noteTitle || "Nursing note"}</p>
                        <p className="mt-1 text-xs text-[#64748b]">{formatDate(note.createdAt)}</p>
                      </div>
                      <Badge value={note.patientCondition} tone={conditionTone} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#475569]">{note.noteDescription || "-"}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-4 py-6 text-center text-sm text-[#64748b]">
                  No nursing notes yet.
                </p>
              )}
            </div>
          </section>

          <form onSubmit={onSubmit} className="rounded-2xl border border-[#dbe6f7] bg-white p-4">
            <h3 className="font-bold text-[#0f172a]">Add Note</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">
                Note Title
                <input className={inputClass} value={form.noteTitle} onChange={(e) => onChange("noteTitle", e.target.value)} required />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">
                Patient Condition
                <select className={inputClass} value={form.patientCondition} onChange={(e) => onChange("patientCondition", e.target.value)}>
                  {CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">
                Note Description
                <textarea
                  className="min-h-32 w-full resize-none rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm text-[#0f172a] outline-none transition focus:border-blue-300 focus:bg-white"
                  value={form.noteDescription}
                  onChange={(e) => onChange("noteDescription", e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Note
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

function BedStatusModal({ admission, value, saving, onChange, onClose, onSubmit }) {
  const current = admission.bedId?.bedStatus || "";
  const options = allowedBedStatuses(current);

  return (
    <Modal title="Update Bed Status" subtitle={`Bed ${admission.bedId?.bedNumber || "-"} is currently ${current || "unknown"}`} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 px-5 py-5">
          <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#334155]">
            Nurses can only make safe transitions: Cleaning to Available, Available to Maintenance, and Maintenance to Available.
          </div>
          {options.length ? (
            <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">
              Next Status
              <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} required>
                {options.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          ) : (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              This bed status cannot be changed by nurses.
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#334155]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !options.length}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update Status
          </button>
        </div>
      </form>
    </Modal>
  );
}
