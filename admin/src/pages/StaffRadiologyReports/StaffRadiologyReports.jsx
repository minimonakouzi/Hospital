import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Eye, FileText, Loader2, Pencil, Plus, Search, Send, Trash2, X } from "lucide-react";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";
import { createStaffRadiologyReport, deleteStaffRadiologyReport, fetchStaffRadiologyReports, updateStaffRadiologyReport } from "../../api/staffRadiologyReportApi";
import LookupSelect, { admissionLabel, appointmentLabel, doctorLabel, itemId, patientLabel, serviceAppointmentLabel } from "../../components/LookupSelect/LookupSelect";
import useSavedLookups from "../../hooks/useSavedLookups";
import { getReportFileUrl, openBackendFile } from "../../utils/fileUrl";
import { reportPayloadFromForm } from "../../utils/reportPayload";

const reportTypes = ["All", "X-Ray", "MRI", "CT Scan", "Ultrasound", "Other"];
const statuses = ["All", "Pending", "Completed", "Reviewed"];
const createTypes = reportTypes.slice(1);
const createStatuses = statuses.slice(1);
const empty = { patientId: "", doctorId: "", appointmentId: "", admissionId: "", serviceAppointmentId: "", reportType: "X-Ray", title: "", description: "", findings: "", impression: "", reportDate: "", fileUrl: "", fileName: "", file: null, status: "Completed", notes: "" };
const emptyLookups = { patients: [], doctors: [], admissions: [], appointments: [], serviceAppointments: [] };
const inputClass = "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white";
const date = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "-"; };
const patient = (x) => x?.name || x?.email || x?.phone || x?.patientCode || "Patient";
const doctor = (x) => x?.name || x?.email || "Doctor";

function ReportFileButton({ report }) {
  const fileUrl = getReportFileUrl(report);
  if (!fileUrl) return <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">No file attached</span>;
  return <button type="button" onClick={() => openBackendFile(fileUrl)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Download className="inline h-3.5 w-3.5" /> File</button>;
}

export default function StaffRadiologyReports() {
  const { lookups = emptyLookups, lookupLoading, lookupError } = useSavedLookups({ authMode: "staff" });
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ search: "", reportType: "All", status: "All" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const body = await fetchStaffRadiologyReports(filters);
      setReports(Array.isArray(body.data) ? body.data.filter(Boolean) : []);
    } catch (e) {
      setReports([]);
      setMsg({ type: "error", text: e.message || "Unable to load reports." });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    total: reports.length,
    completed: reports.filter((r) => r.status === "Completed").length,
    pending: reports.filter((r) => r.status === "Pending").length,
    reviewed: reports.filter((r) => r.status === "Reviewed").length,
  }), [reports]);

  function openCreate() { setForm(empty); setModal("create"); }
  function openEdit(r) { setForm({ ...empty, ...r, patientId: itemId(r.patientId), doctorId: itemId(r.doctorId), appointmentId: itemId(r.appointmentId), admissionId: itemId(r.admissionId), serviceAppointmentId: itemId(r.serviceAppointmentId), reportDate: r.reportDate ? String(r.reportDate).slice(0, 10) : "" }); setModal("edit"); }

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = reportPayloadFromForm(form);
      const body = modal === "edit" ? await updateStaffRadiologyReport(itemId(form), payload) : await createStaffRadiologyReport(payload);
      setMsg({ type: "success", text: body.message || "Saved." });
      setModal(null);
      await load();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Unable to save report." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(r) {
    if (!window.confirm(`Delete ${r.reportCode || "this report"}?`)) return;
    try {
      setSaving(true);
      const body = await deleteStaffRadiologyReport(itemId(r));
      setMsg({ type: "success", text: body.message || "Deleted." });
      await load();
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Unable to delete report." });
    } finally {
      setSaving(false);
    }
  }

  return <div><StaffPageHeader title="Radiology Reports" subtitle="Create, review, edit, and manage patient imaging reports." breadcrumb="Staff Portal / Radiology Reports" action={<button onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create Report</button>} /><div className="px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-5">
    <section className="grid gap-4 sm:grid-cols-4"><Stat label="Total" value={summary.total} /><Stat label="Completed" value={summary.completed} /><Stat label="Pending" value={summary.pending} /><Stat label="Reviewed" value={summary.reviewed} /></section>
    <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-11`} value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search reports..." /></div><Select value={filters.reportType} options={reportTypes} onChange={(reportType) => setFilters((p) => ({ ...p, reportType }))} /><Select value={filters.status} options={statuses} onChange={(status) => setFilters((p) => ({ ...p, status }))} /></div></section>
    {msg.text ? <Notice msg={msg} close={() => setMsg({ type: "", text: "" })} /> : null}
    <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">{loading ? <div className="p-14 text-center text-sm font-bold text-blue-700"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Loading reports...</div> : reports.length === 0 ? <Empty /> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100 text-sm"><thead className="bg-[#f8fbff] text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-4 text-left">Report</th><th className="px-5 py-4 text-left">Patient</th><th className="px-5 py-4 text-left">Doctor</th><th className="px-5 py-4 text-left">Date</th><th className="px-5 py-4 text-left">Status</th><th className="px-5 py-4 text-left">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{reports.map((r) => <tr key={itemId(r)}><td className="px-5 py-4"><p className="font-black text-blue-700">{r.reportCode}</p><p className="font-bold text-slate-900">{r.title}</p><Badge>{r.reportType}</Badge></td><td className="px-5 py-4">{patient(r.patientId)}</td><td className="px-5 py-4">{doctor(r.doctorId)}</td><td className="px-5 py-4">{date(r.reportDate)}</td><td className="px-5 py-4"><Badge>{r.status}</Badge></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => setSelected(r)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><Eye className="inline h-3.5 w-3.5" /> View</button><button onClick={() => openEdit(r)} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"><Pencil className="inline h-3.5 w-3.5" /> Edit</button><button onClick={() => remove(r)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 className="inline h-3.5 w-3.5" /> Delete</button><ReportFileButton report={r} /></div></td></tr>)}</tbody></table></div>}</section>
  </div></div>{modal ? <ReportForm mode={modal} form={form} setForm={setForm} submit={submit} saving={saving} close={() => setModal(null)} lookups={lookups} lookupLoading={lookupLoading} lookupError={lookupError} /> : null}{selected ? <Detail r={selected} close={() => setSelected(null)} /> : null}</div>;
}

function Select({ value, options, onChange }) { return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((x) => <option key={x}>{x}</option>)}</select>; }
function Stat({ label, value }) { return <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-blue-700">{value}</p></div>; }
function Notice({ msg, close }) { const ok = msg.type === "success"; return <div className={`flex justify-between rounded-2xl border p-4 text-sm font-bold ${ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}><span>{ok ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertCircle className="mr-2 inline h-4 w-4" />}{msg.text}</span><button onClick={close}><X className="h-4 w-4" /></button></div>; }
function Empty() { return <div className="p-14 text-center"><FileText className="mx-auto h-12 w-12 text-blue-700" /><h2 className="mt-3 font-black">No radiology reports found.</h2></div>; }

function ReportForm({ mode, form, setForm, submit, saving, close, lookups, lookupLoading, lookupError }) {
  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><div><h2 className="text-xl font-black">{mode === "edit" ? "Edit" : "Create"} Radiology Report</h2><p className="mt-1 text-sm text-slate-500">Select saved patient and visit records. Attach a PDF or image when the report file is ready.</p></div><button type="button" onClick={close}><X /></button></div>{lookupError ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">{lookupError}</div> : null}<div className="mt-5 grid gap-4 md:grid-cols-2"><LookupSelect label="Patient" required allowEmpty={false} value={form.patientId} onChange={(v) => setField("patientId", v)} options={lookups.patients} getLabel={patientLabel} loading={lookupLoading} /><LookupSelect label="Doctor" value={form.doctorId} onChange={(v) => setField("doctorId", v)} options={lookups.doctors} getLabel={doctorLabel} loading={lookupLoading} /><LookupSelect label="Appointment" value={form.appointmentId} onChange={(v) => setField("appointmentId", v)} options={lookups.appointments} getLabel={appointmentLabel} loading={lookupLoading} /><LookupSelect label="Admission" value={form.admissionId} onChange={(v) => setField("admissionId", v)} options={lookups.admissions} getLabel={admissionLabel} loading={lookupLoading} /><LookupSelect label="Service Appointment" value={form.serviceAppointmentId} onChange={(v) => setField("serviceAppointmentId", v)} options={lookups.serviceAppointments} getLabel={serviceAppointmentLabel} loading={lookupLoading} /><Field label="Title" required value={form.title} onChange={(v) => setField("title", v)} /><FileField form={form} setField={setField} /><label className="grid gap-1 text-sm font-bold">Report Type<Select value={form.reportType} options={createTypes} onChange={(v) => setField("reportType", v)} /></label><label className="grid gap-1 text-sm font-bold">Status<Select value={form.status} options={createStatuses} onChange={(v) => setField("status", v)} /></label><label className="grid gap-1 text-sm font-bold">Report Date<input type="date" className={inputClass} value={form.reportDate || ""} onChange={(e) => setField("reportDate", e.target.value)} /></label>{["description", "findings", "impression", "notes"].map((k) => <label key={k} className="grid gap-1 text-sm font-bold md:col-span-2">{k}<textarea className={`${inputClass} min-h-24 py-3`} value={form[k] || ""} onChange={(e) => setField(k, e.target.value)} /></label>)}</div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={close} className="h-11 rounded-2xl border px-4 font-bold">Cancel</button><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 font-bold text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Save</button></div></form></div>;
}

function Field({ label, value, onChange, required = false }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<input required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function FileField({ form, setField }) {
  return <label className="grid gap-1 text-sm font-bold">Report file<input type="file" accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" className={`${inputClass} h-auto py-2`} onChange={(e) => setField("file", e.target.files?.[0] || null)} /><span className="text-xs font-semibold text-slate-500">{form.file?.name || form.fileName || "No file attached"}</span></label>;
}

function Detail({ r, close }) { return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-black">{r.reportCode} - {r.title}</h2><button onClick={close}><X /></button></div><div className="mt-4 grid gap-3">{["description", "findings", "impression", "notes"].map((k) => <div key={k} className="rounded-2xl bg-slate-50 p-4"><p className="font-black capitalize text-slate-500">{k}</p><p className="mt-1 whitespace-pre-wrap text-sm">{r[k] || "-"}</p></div>)}</div></div></div>; }
