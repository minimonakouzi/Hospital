import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { AlertCircle, Download, Eye, FileText, Loader2, Search, ShieldPlus, X } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { fetchMyLabReports } from "../../api/labReportApi";

const testTypes = ["All", "Blood Test", "Urine Test", "Diabetes Test", "Cholesterol Test", "Infection Test", "Other"];
const statuses = ["All", "Requested", "In Progress", "Completed", "Reviewed"];
const inputClass = "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white";
const itemId = (x = {}) => x._id || x.id || "";
const fmt = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "-"; };
const doctor = (d = {}) => d?.name || d?.email || "Doctor";
function cls(v) { if (v === "Critical") return "bg-rose-50 text-rose-700 ring-rose-100"; if (v === "High") return "bg-orange-50 text-orange-700 ring-orange-100"; if (v === "Low") return "bg-amber-50 text-amber-700 ring-amber-100"; return "bg-blue-50 text-blue-700 ring-blue-100"; }
function Badge({ children }) { return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${cls(children)}`}>{children || "-"}</span>; }

function DetailModal({ report, onClose }) {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div><p className="text-sm font-black text-blue-700">{report.reportCode || "Lab Report"}</p><h2 className="text-xl font-black text-slate-950">{report.title || "Lab report"}</h2></div>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Info label="Test Type" value={report.testType} /><Info label="Status" value={report.status} />
          <Info label="Doctor" value={doctor(report.requestedByDoctorId)} /><Info label="Requested" value={fmt(report.requestedDate)} />
          <Info label="Specimen" value={report.specimen || "-"} /><Info label="Result Date" value={fmt(report.resultDate)} />
          <Info label="Description" value={report.description || "-"} wide />
          <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Results</p>
            {(report.results || []).length === 0 ? <p className="mt-2 text-sm text-slate-500">No result rows recorded.</p> : <div className="mt-3 overflow-x-auto"><table className="min-w-full text-sm"><tbody>{report.results.map((r, i) => <tr key={i} className="border-b border-slate-200"><td className="py-2 font-bold">{r.testName || "-"}</td><td>{r.value || "-"}</td><td>{r.unit || "-"}</td><td>{r.referenceRange || "-"}</td><td><Badge>{r.flag || "Normal"}</Badge></td></tr>)}</tbody></table></div>}
          </div>
          <Info label="Summary" value={report.resultSummary || "-"} wide /><Info label="Interpretation" value={report.interpretation || "-"} wide /><Info label="Notes" value={report.notes || "-"} wide />
          {report.fileUrl ? <a href={report.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white md:w-fit"><Download className="h-4 w-4" />View / Download</a> : null}
        </div>
      </div>
    </div>
  );
}
function Info({ label, value, wide }) { return <div className={`rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 ${wide ? "md:col-span-2" : ""}`}><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{value || "-"}</p></div>; }

function MyLabContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ search: "", testType: "All", status: "All" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) { setReports([]); setLoading(false); return; }
    try { setLoading(true); setError(""); const body = await fetchMyLabReports(filters, getToken); setReports(Array.isArray(body.data) ? body.data : []); }
    catch (e) { setReports([]); setError(e.message || "Unable to load lab reports."); }
    finally { setLoading(false); }
  }, [filters, getToken, isLoaded, isSignedIn]);
  useEffect(() => { load(); }, [load]);
  const summary = useMemo(() => ({ total: reports.length, requested: reports.filter(r => r.status === "Requested").length, progress: reports.filter(r => r.status === "In Progress").length, completed: reports.filter(r => r.status === "Completed").length, reviewed: reports.filter(r => r.status === "Reviewed").length }), [reports]);
  if (!isLoaded || loading) return <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28"><div className="mx-auto flex max-w-4xl justify-center rounded-3xl bg-white p-10 text-sm font-bold text-blue-700"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading lab reports...</div></main>;
  if (!isSignedIn) return <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm"><ShieldPlus className="mx-auto h-11 w-11 text-blue-700" /><h1 className="mt-4 text-3xl font-black">Lab Reports</h1><p className="mt-2 text-sm text-slate-500">Sign in to view your lab results.</p><button onClick={() => clerk.openSignIn()} className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Sign In</button></div></main>;
  return <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28"><div className="mx-auto max-w-7xl space-y-6"><section className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(30,64,175,0.08)] lg:p-8"><div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-100"><FileText className="h-4 w-4" />Patient Reports</div><h1 className="mt-5 text-4xl font-black text-slate-950 md:text-5xl">Lab Reports</h1><p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">View pathology and laboratory requests, results, and attached reports.</p></section><section className="grid gap-4 sm:grid-cols-5">{Object.entries(summary).map(([k, v]) => <Stat key={k} label={k} value={v} />)}</section><section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_210px_180px]"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-11`} value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} placeholder="Search lab reports..." /></div><Select value={filters.testType} options={testTypes} onChange={testType => setFilters(p => ({ ...p, testType }))} /><Select value={filters.status} options={statuses} onChange={status => setFilters(p => ({ ...p, status }))} /></div></section>{error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div> : null}<section className="grid gap-4">{reports.length === 0 ? <Empty /> : reports.map(r => <article key={itemId(r)} className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap gap-2"><span className="text-sm font-black text-blue-700">{r.reportCode || "Report"}</span><Badge>{r.testType}</Badge><Badge>{r.status}</Badge></div><h2 className="mt-3 text-lg font-black text-slate-950">{r.title || "Lab report"}</h2><p className="mt-2 text-sm text-slate-500">Dr. {doctor(r.requestedByDoctorId)} | Requested {fmt(r.requestedDate)} | Result {fmt(r.resultDate)}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setSelected(r)} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-50 px-4 text-sm font-bold text-blue-700"><Eye className="h-4 w-4" />View</button>{r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"><Download className="h-4 w-4" />Download</a> : null}</div></div></article>)}</section></div><DetailModal report={selected} onClose={() => setSelected(null)} /></main>;
}
function Select({ value, options, onChange }) { return <select className={inputClass} value={value} onChange={e => onChange(e.target.value)}>{options.map(x => <option key={x}>{x}</option>)}</select>; }
function Stat({ label, value }) { return <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-blue-700">{value}</p></div>; }
function Empty() { return <div className="rounded-3xl border border-dashed border-[#cbdcf6] bg-white px-6 py-12 text-center shadow-sm"><FileText className="mx-auto h-12 w-12 text-blue-700" /><h2 className="mt-4 text-xl font-black text-slate-950">No lab reports found.</h2><p className="mt-2 text-sm text-slate-500">Lab requests and results from your care team will appear here.</p></div>; }

export default function MyLabReports() { return <div><Navbar /><MyLabContent /><Footer /></div>; }
