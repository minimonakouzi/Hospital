import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPlus,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api`;
const DOCTOR_TOKEN_KEY = "doctorToken_v1";
const emptyMedicine = {
  medicineName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};
const emptyForm = {
  patientId: "",
  diagnosis: "",
  notes: "",
  medicines: [{ ...emptyMedicine }],
};

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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function patientName(patient = {}) {
  return patient?.name || patient?.email || patient?.phone || patient?.patientCode || "Patient";
}

function patientLabel(patient = {}) {
  return [patient.patientCode || "Patient", patientName(patient), patient.email || patient.phone || ""]
    .filter(Boolean)
    .join(" - ");
}

function statusTone(status = "") {
  if (status === "Cancelled") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (status === "Completed") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function Notice({ message, onClose }) {
  if (!message.text) return null;
  const success = message.type === "success";
  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${success ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>
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

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/prescriptions/doctor`, {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Unable to load prescriptions.");
      setPrescriptions(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      setPrescriptions([]);
      setMessage({ type: "error", text: err?.message || "Unable to load prescriptions." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  useEffect(() => {
    let active = true;
    setPatientsLoading(true);
    fetch(`${API_BASE}/prescriptions/doctor/patients?search=${encodeURIComponent(patientSearch)}`, {
      headers: authHeaders(),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message || "Unable to load patients.");
        if (active) setPatients(Array.isArray(body?.data) ? body.data : []);
      })
      .catch((err) => {
        if (active) {
          setPatients([]);
          setMessage({ type: "error", text: err?.message || "Unable to load patients." });
        }
      })
      .finally(() => {
        if (active) setPatientsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter((item) =>
      [
        item.patientId?.patientCode,
        patientName(item.patientId),
        item.doctorId?.name,
        item.diagnosis,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [prescriptions, query]);

  function openCreate() {
    setModal({ type: "form", form: { ...emptyForm, medicines: [{ ...emptyMedicine }] } });
  }

  function openEdit(prescription) {
    setModal({
      type: "form",
      prescription,
      form: {
        patientId: itemId(prescription.patientId),
        diagnosis: prescription.diagnosis || "",
        notes: prescription.notes || "",
        status: prescription.status || "Active",
        medicines: (prescription.medicines || []).length ? prescription.medicines.map((m) => ({ ...emptyMedicine, ...m })) : [{ ...emptyMedicine }],
      },
    });
  }

  function updateForm(field, value) {
    setModal((current) => ({ ...current, form: { ...current.form, [field]: value } }));
  }

  function updateMedicine(index, field, value) {
    setModal((current) => ({
      ...current,
      form: {
        ...current.form,
        medicines: current.form.medicines.map((medicine, i) =>
          i === index ? { ...medicine, [field]: value } : medicine
        ),
      },
    }));
  }

  function addMedicine() {
    setModal((current) => ({
      ...current,
      form: { ...current.form, medicines: [...current.form.medicines, { ...emptyMedicine }] },
    }));
  }

  function removeMedicine(index) {
    setModal((current) => {
      const next = current.form.medicines.filter((_, i) => i !== index);
      return { ...current, form: { ...current.form, medicines: next.length ? next : [{ ...emptyMedicine }] } };
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!modal?.form) return;

    try {
      setSaving(true);
      const editing = Boolean(modal.prescription);
      const id = itemId(modal.prescription);
      const res = await fetch(editing ? `${API_BASE}/prescriptions/${id}` : `${API_BASE}/prescriptions`, {
        method: editing ? "PUT" : "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(modal.form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Unable to save prescription.");
      setModal(null);
      setMessage({ type: "success", text: body?.message || "Prescription saved." });
      await loadPrescriptions();
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Unable to save prescription." });
    } finally {
      setSaving(false);
    }
  }

  async function cancelPrescription(prescription) {
    if (!window.confirm("Cancel this prescription?")) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/prescriptions/${itemId(prescription)}/cancel`, {
        method: "PUT",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Unable to cancel prescription.");
      setMessage({ type: "success", text: body?.message || "Prescription cancelled." });
      await loadPrescriptions();
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Unable to cancel prescription." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc]">
      <div className="border-b border-[#dbe6f7] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Doctor / eRx</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Digital Prescriptions</h1>
            <p className="mt-1 text-sm text-[#64748b]">Create and manage official prescriptions for Revive patients.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={loadPrescriptions} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-semibold text-[#2563eb]">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button type="button" onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-semibold text-white">
              <ClipboardPlus className="h-4 w-4" />
              New Prescription
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5">
          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input className={`${inputClass} pl-11`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, diagnosis, status..." />
            </div>
          </section>

          <Notice message={message} onClose={() => setMessage({ type: "", text: "" })} />

          <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-16 text-sm font-semibold text-[#2563eb]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading prescriptions...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-[#64748b]">
                <FileText className="mx-auto mb-3 h-10 w-10 text-[#2563eb]" />
                No prescriptions found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((prescription) => (
                  <article key={itemId(prescription)} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_180px_220px] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563eb]">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-[#0f172a]">{patientName(prescription.patientId)}</h2>
                        <p className="mt-1 text-xs font-bold text-[#2563eb]">{prescription.patientId?.patientCode || "Patient ID pending"}</p>
                        <p className="mt-1 truncate text-sm text-[#64748b]">{prescription.diagnosis || "No diagnosis noted"}</p>
                      </div>
                    </div>
                    <div className="text-sm text-[#64748b]">
                      <p className="font-semibold text-[#0f172a]">{prescription.medicines?.length || 0} medicine{prescription.medicines?.length === 1 ? "" : "s"}</p>
                      <p className="mt-1">{formatDate(prescription.createdAt)}</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(prescription.status)}`}>{prescription.status}</span>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button type="button" onClick={() => setModal({ type: "view", prescription })} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-50 px-3 text-sm font-semibold text-[#2563eb]">
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      {prescription.status !== "Cancelled" ? (
                        <button type="button" onClick={() => openEdit(prescription)} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dbe6f7] bg-white px-3 text-sm font-semibold text-[#334155]">
                          Edit
                        </button>
                      ) : null}
                      {prescription.status !== "Cancelled" ? (
                        <button type="button" onClick={() => cancelPrescription(prescription)} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-rose-50 px-3 text-sm font-semibold text-rose-700">
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {modal?.type === "form" ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
          <form onSubmit={submitForm} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#0f172a]">{modal.prescription ? "Update Prescription" : "New Prescription"}</h2>
                <p className="mt-1 text-sm text-[#64748b]">Only doctors can create official eRx records.</p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="rounded-2xl border border-slate-200 p-2 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 px-5 py-5">
              <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">
                Patient
                <input className={inputClass} value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patient ID, name, email, or phone" />
                <select className={inputClass} value={modal.form.patientId} onChange={(e) => updateForm("patientId", e.target.value)} required>
                  <option value="">{patientsLoading ? "Loading patients..." : "Select patient"}</option>
                  {patients.map((patient) => (
                    <option key={itemId(patient)} value={itemId(patient)}>
                      {patientLabel(patient)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">
                Diagnosis
                <input className={inputClass} value={modal.form.diagnosis} onChange={(e) => updateForm("diagnosis", e.target.value)} placeholder="Diagnosis or clinical impression" />
              </label>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0f172a]">Medicines</h3>
                  <button type="button" onClick={addMedicine} className="inline-flex h-9 items-center gap-2 rounded-2xl bg-blue-50 px-3 text-sm font-semibold text-[#2563eb]">
                    <Plus className="h-4 w-4" />
                    Add Medicine
                  </button>
                </div>
                {modal.form.medicines.map((medicine, index) => (
                  <div key={index} className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        ["medicineName", "Medicine name"],
                        ["dosage", "Dosage"],
                        ["frequency", "Frequency"],
                        ["duration", "Duration"],
                      ].map(([field, label]) => (
                        <input key={field} className={inputClass} value={medicine[field]} onChange={(e) => updateMedicine(index, field, e.target.value)} placeholder={label} required />
                      ))}
                      <input className={`${inputClass} md:col-span-2`} value={medicine.instructions} onChange={(e) => updateMedicine(index, "instructions", e.target.value)} placeholder="Instructions" />
                    </div>
                    <button type="button" onClick={() => removeMedicine(index)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-2xl bg-rose-50 px-3 text-sm font-semibold text-rose-700">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">
                Notes
                <textarea className="min-h-24 rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-blue-300 focus:bg-white" value={modal.form.notes} onChange={(e) => updateForm("notes", e.target.value)} />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setModal(null)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#334155]">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white disabled:opacity-70">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Prescription
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal?.type === "view" ? <PrescriptionDetails prescription={modal.prescription} onClose={() => setModal(null)} /> : null}
    </div>
  );
}

function PrescriptionDetails({ prescription, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">Prescription Details</h2>
            <p className="mt-1 text-sm text-[#64748b]">{patientLabel(prescription.patientId || {})}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-5">
          <div className="rounded-2xl bg-[#f8fbff] p-4 ring-1 ring-[#dbe6f7]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">Diagnosis</p>
            <p className="mt-2 text-sm text-[#334155]">{prescription.diagnosis || "-"}</p>
          </div>
          {(prescription.medicines || []).map((medicine, index) => (
            <div key={index} className="rounded-2xl border border-[#dbe6f7] bg-white p-4">
              <p className="font-bold text-[#0f172a]">{medicine.medicineName}</p>
              <p className="mt-2 text-sm text-[#64748b]">
                {medicine.dosage} | {medicine.frequency} | {medicine.duration}
              </p>
              {medicine.instructions ? <p className="mt-2 text-sm text-[#334155]">{medicine.instructions}</p> : null}
            </div>
          ))}
          {prescription.notes ? (
            <div className="rounded-2xl bg-[#f8fbff] p-4 text-sm text-[#334155] ring-1 ring-[#dbe6f7]">{prescription.notes}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
