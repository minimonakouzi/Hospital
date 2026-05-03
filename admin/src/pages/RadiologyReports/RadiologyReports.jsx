import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Plus, Search, Send, Trash2, X } from "lucide-react";
import { createAdminRadiologyReport, deleteAdminRadiologyReport, fetchAdminRadiologyReports } from "../../api/staffRadiologyReportApi";
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
const inputClass = "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm outline-none focus:border-blue-300 focus:bg-white";
const date = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : "-"; };
const name = (x) => x?.name || x?.email || x?.patientCode || "Patient";

function ReportFileButton({ report }) {
  const fileUrl = getReportFileUrl(report);
  if (!fileUrl) return <span className="ml-2 rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-500">No file attached</span>;
  return <button type="button" onClick={() => openBackendFile(fileUrl)} className="ml-2 rounded-xl bg-blue-600 px-3 py-2 font-bold text-white"><Download className="inline h-4 w-4" /> File</button>;
}

export default function RadiologyReports() {
  const { getToken } = useAuth();
  const { lookups = emptyLookups, lookupLoading, lookupError } = useSavedLookups({ authMode: "admin", getToken });
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ search: "", reportType: "All", status: "All" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const body = await fetchAdminRadiologyReports(filters, getToken);
      setReports(Array.isArray(body.data) ? body.data.filter(Boolean) : []);
    } catch (e) {
      setReports([]);
      setMsg({ type: "error", text: e.message || "Unable to load reports." });
    } finally {
      setLoading(false);
    }
  }, [filters, getToken]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    total: reports.length,
    completed: reports.filter((r) => r.status === "Completed").length,
    pending: reports.filter((r) => r.status === "Pending").length,
    reviewed: reports.filter((r) => r.status === "Reviewed").length,
  }), [reports]);

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = reportPayloadFromForm(form);
      const body = await createAdminRadiologyReport(payload, getToken);
      setMsg({ type: "success", text: body.message || "Created." });
      setOpen(false);
      setForm(empty);
      await load();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Unable to create report." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(r) {
    if (!window.confirm(`Delete ${r.reportCode}?`)) return;
    try {
      const body = await deleteAdminRadiologyReport(itemId(r), getToken);
      setMsg({ type: "success", text: body.message || "Deleted." });
      await load();
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Unable to delete." });
    }
  }

  return (
    <AdminLayout title="Radiology Reports" subtitle="View all radiology reports and create patient imaging records.">
      <div className="grid gap-5">
        <button onClick={() => { setForm(empty); setOpen(true); }} className="w-fit rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"><Plus className="mr-2 inline h-4 w-4" />Create Report</button>
        <section className="grid gap-4 sm:grid-cols-4"><Stat label="Total" v={summary.total} /><Stat label="Completed" v={summary.completed} /><Stat label="Pending" v={summary.pending} /><Stat label="Reviewed" v={summary.reviewed} /></section>
        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4"><div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-11`} value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} /></div><Select value={filters.reportType} options={reportTypes} onChange={(reportType) => setFilters((p) => ({ ...p, reportType }))} /><Select value={filters.status} options={statuses} onChange={(status) => setFilters((p) => ({ ...p, status }))} /></div></section>
        {msg.text ? <Notice msg={msg} close={() => setMsg({ type: "", text: "" })} /> : null}
        <section className="rounded-3xl border border-[#dbe6f7] bg-white">{loading ? <div className="p-12 text-center text-blue-700"><Loader2 className="inline h-5 w-5 animate-spin" /> Loading...</div> : reports.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto h-12 w-12 text-blue-700" /><b>No radiology reports found.</b></div> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><tbody>{reports.map((r) => <tr key={itemId(r)} className="border-b"><td className="p-4"><b className="text-blue-700">{r.reportCode}</b><p>{r.title}</p><small>{r.reportType} | {r.status}</small></td><td className="p-4">{name(r.patientId)}</td><td className="p-4">{date(r.reportDate)}</td><td className="p-4"><button onClick={() => remove(r)} className="rounded-xl bg-rose-50 px-3 py-2 font-bold text-rose-700"><Trash2 className="inline h-4 w-4" /> Delete</button><ReportFileButton report={r} /></td></tr>)}</tbody></table></div>}</section>
      </div>
      {open ? <Form form={form} setForm={setForm} submit={submit} saving={saving} close={() => setOpen(false)} lookups={lookups} lookupLoading={lookupLoading} lookupError={lookupError} /> : null}
    </AdminLayout>
  );
}

function Select({ value, options, onChange }) { return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((x) => <option key={x}>{x}</option>)}</select>; }
function Stat({ label, v }) { return <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4"><p className="text-xs font-black uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-blue-700">{v}</p></div>; }
function Notice({ msg, close }) { const ok = msg.type === "success"; return <div className={`flex justify-between rounded-2xl border p-4 text-sm font-bold ${ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}><span>{ok ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertCircle className="mr-2 inline h-4 w-4" />}{msg.text}</span><button onClick={close}><X className="h-4 w-4" /></button></div>; }

function Form({ form, setForm, submit, saving, close, lookups, lookupLoading, lookupError }) {
  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><div><h2 className="text-xl font-black">Create Radiology Report</h2><p className="mt-1 text-sm text-slate-500">Select saved patient and visit records. Attach a PDF or image when the report file is ready.</p></div><button type="button" onClick={close}><X /></button></div>{lookupError ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">{lookupError}</div> : null}<div className="mt-5 grid gap-4 md:grid-cols-2"><LookupSelect label="Patient" required allowEmpty={false} value={form.patientId} onChange={(v) => setField("patientId", v)} options={lookups.patients} getLabel={patientLabel} loading={lookupLoading} /><LookupSelect label="Doctor" value={form.doctorId} onChange={(v) => setField("doctorId", v)} options={lookups.doctors} getLabel={doctorLabel} loading={lookupLoading} /><LookupSelect label="Appointment" value={form.appointmentId} onChange={(v) => setField("appointmentId", v)} options={lookups.appointments} getLabel={appointmentLabel} loading={lookupLoading} /><LookupSelect label="Admission" value={form.admissionId} onChange={(v) => setField("admissionId", v)} options={lookups.admissions} getLabel={admissionLabel} loading={lookupLoading} /><LookupSelect label="Service Appointment" value={form.serviceAppointmentId} onChange={(v) => setField("serviceAppointmentId", v)} options={lookups.serviceAppointments} getLabel={serviceAppointmentLabel} loading={lookupLoading} /><Field label="Title" required value={form.title} onChange={(v) => setField("title", v)} /><FileField form={form} setField={setField} /><label className="grid gap-1 text-sm font-bold">Report Type<Select value={form.reportType} options={createTypes} onChange={(v) => setField("reportType", v)} /></label><label className="grid gap-1 text-sm font-bold">Status<Select value={form.status} options={createStatuses} onChange={(v) => setField("status", v)} /></label>{["description", "findings", "impression", "notes"].map((k) => <label key={k} className="grid gap-1 text-sm font-bold md:col-span-2">{k}<textarea className={`${inputClass} min-h-20 py-3`} value={form[k]} onChange={(e) => setField(k, e.target.value)} /></label>)}</div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={close} className="h-11 rounded-2xl border px-4 font-bold">Cancel</button><button disabled={saving} className="h-11 rounded-2xl bg-blue-600 px-4 font-bold text-white"><Send className="mr-2 inline h-4 w-4" />Create</button></div></form></div>;
}

function Field({ label, value, onChange, required = false }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<input required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function FileField({ form, setField }) {
  return <label className="grid gap-1 text-sm font-bold">Report file<input type="file" accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" className={`${inputClass} h-auto py-2`} onChange={(e) => setField("file", e.target.files?.[0] || null)} /><span className="text-xs font-semibold text-slate-500">{form.file?.name || form.fileName || "No file attached"}</span></label>;
}
