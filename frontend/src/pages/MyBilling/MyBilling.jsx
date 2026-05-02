import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import {
  AlertCircle,
  CreditCard,
  Eye,
  Loader2,
  Printer,
  Search,
  ShieldPlus,
  X,
} from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { fetchMyBills } from "../../api/patientBillApi";

const billTypes = ["All", "Appointment", "Service", "Admission", "Lab", "Radiology", "Prescription", "Other"];
const paymentStatuses = ["All", "Unpaid", "Paid", "Partially Paid", "Refunded"];
const insuranceStatuses = ["All", "Not Provided", "Submitted", "Approved", "Rejected", "Pending"];
const inputClass = "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white";
const idOf = (item = {}) => item._id || item.id || "";
const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const money = (value) => `$${safeNumber(value).toFixed(2)}`;
const date = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "-";
};
const patientName = (patient = {}) => patient?.name || patient?.patientCode || patient?.email || "Patient";

function badgeClass(value) {
  if (value === "Paid" || value === "Approved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (value === "Unpaid" || value === "Rejected") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (value === "Partially Paid" || value === "Pending") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function Badge({ children }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${badgeClass(children)}`}>{children || "-"}</span>;
}

function Select({ value, options, onChange }) {
  return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select>;
}

function Stat({ label, value }) {
  return <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-blue-700">{value}</p></div>;
}

function Info({ label, value, wide }) {
  return <div className={`rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 ${wide ? "md:col-span-2" : ""}`}><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{value || "-"}</p></div>;
}

function Invoice({ bill }) {
  return (
    <div className="print-area rounded-3xl bg-white p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-blue-700">Revive Hospital</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Invoice {bill.billCode || ""}</h2>
          <p className="mt-1 text-sm text-slate-500">{bill.description || "Patient billing invoice"}</p>
        </div>
        <div className="text-sm text-slate-600 sm:text-right">
          <p>Invoice: {date(bill.invoiceDate)}</p>
          <p>Due: {date(bill.dueDate)}</p>
          <p>Patient: {patientName(bill.patientId)}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8fbff] text-left text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(bill.items || []).length ? bill.items.map((item, index) => (
              <tr key={index}><td className="px-4 py-3 font-semibold">{item.title || "-"}</td><td className="px-4 py-3">{Number(item.quantity || 0)}</td><td className="px-4 py-3">{money(item.unitPrice)}</td><td className="px-4 py-3 text-right font-bold">{money(item.total)}</td></tr>
            )) : <tr><td className="px-4 py-4 text-slate-500" colSpan="4">No invoice items recorded.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Info label="Payment Status" value={bill.paymentStatus} />
        <Info label="Payment Method" value={bill.paymentMethod || "-"} />
        <Info label="Insurance Provider" value={bill.insuranceProvider || "-"} />
        <Info label="Insurance Status" value={bill.insuranceStatus || "-"} />
      </div>

      <div className="mt-5 rounded-3xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
        {[
          ["Subtotal", bill.subtotal],
          ["Discount", bill.discount],
          ["Tax", bill.tax],
          ["Total", bill.totalAmount],
          ["Insurance Coverage", bill.insuranceCoverageAmount],
          ["Patient Payable", bill.patientPayableAmount],
          ["Paid", bill.paidAmount],
          ["Due", bill.dueAmount],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-white py-2 last:border-b-0">
            <span className="font-semibold text-slate-600">{label}</span>
            <span className="font-black text-slate-950">{money(value)}</span>
          </div>
        ))}
      </div>

      {bill.notes ? <Info label="Notes" value={bill.notes} wide /> : null}
    </div>
  );
}

function DetailModal({ bill, onClose }) {
  if (!bill) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <style>{`@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; border-radius: 0 !important; box-shadow: none !important; } .no-print { display: none !important; } }`}</style>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="no-print flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div><p className="text-sm font-black text-blue-700">{bill.billCode || "Invoice"}</p><h2 className="text-xl font-black text-slate-950">Invoice details</h2></div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"><Printer className="h-4 w-4" />Print Invoice</button>
            <button onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <Invoice bill={bill} />
      </div>
    </div>
  );
}

function MyBillingContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const [bills, setBills] = useState([]);
  const [filters, setFilters] = useState({ search: "", billType: "All", paymentStatus: "All", insuranceStatus: "All" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) { setBills([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError("");
      const body = await fetchMyBills(filters, getToken);
      setBills(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      setBills([]);
      setError(err.message || "Unable to load billing records.");
    } finally {
      setLoading(false);
    }
  }, [filters, getToken, isLoaded, isSignedIn]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    total: bills.length,
    paid: bills.filter((bill) => bill.paymentStatus === "Paid").length,
    unpaid: bills.filter((bill) => bill.paymentStatus === "Unpaid").length,
    partial: bills.filter((bill) => bill.paymentStatus === "Partially Paid").length,
    outstanding: bills.reduce((sum, bill) => sum + safeNumber(bill.dueAmount), 0),
  }), [bills]);

  if (!isLoaded || loading) return <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28"><div className="mx-auto flex max-w-4xl justify-center rounded-3xl bg-white p-10 text-sm font-bold text-blue-700"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading billing records...</div></main>;
  if (!isSignedIn) return <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm"><ShieldPlus className="mx-auto h-11 w-11 text-blue-700" /><h1 className="mt-4 text-3xl font-black">Billing</h1><p className="mt-2 text-sm text-slate-500">Sign in to view your invoices and insurance details.</p><button onClick={() => clerk.openSignIn()} className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Sign In</button></div></main>;

  return (
    <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(30,64,175,0.08)] lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-100"><CreditCard className="h-4 w-4" />Patient Billing</div>
          <h1 className="mt-5 text-4xl font-black text-slate-950 md:text-5xl">Billing</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">Review invoices, due balances, payment status, and insurance tracking from your account.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-5">
          <Stat label="Total Bills" value={summary.total} />
          <Stat label="Paid" value={summary.paid} />
          <Stat label="Unpaid" value={summary.unpaid} />
          <Stat label="Partial" value={summary.partial} />
          <Stat label="Outstanding" value={money(summary.outstanding)} />
        </section>

        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_170px_170px_190px]">
            <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-11`} value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search invoices..." /></div>
            <Select value={filters.billType} options={billTypes} onChange={(billType) => setFilters((p) => ({ ...p, billType }))} />
            <Select value={filters.paymentStatus} options={paymentStatuses} onChange={(paymentStatus) => setFilters((p) => ({ ...p, paymentStatus }))} />
            <Select value={filters.insuranceStatus} options={insuranceStatuses} onChange={(insuranceStatus) => setFilters((p) => ({ ...p, insuranceStatus }))} />
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div> : null}

        <section className="grid gap-4">
          {bills.length === 0 ? <div className="rounded-3xl border border-dashed border-[#cbdcf6] bg-white px-6 py-12 text-center shadow-sm"><CreditCard className="mx-auto h-12 w-12 text-blue-700" /><h2 className="mt-4 text-xl font-black text-slate-950">No billing records found.</h2><p className="mt-2 text-sm text-slate-500">Invoices and insurance updates will appear here.</p></div> : bills.map((bill) => (
            <article key={idOf(bill)} className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2"><span className="text-sm font-black text-blue-700">{bill.billCode || "Invoice"}</span><Badge>{bill.billType}</Badge><Badge>{bill.paymentStatus}</Badge><Badge>{bill.insuranceStatus}</Badge></div>
                  <h2 className="mt-3 text-lg font-black text-slate-950">{money(bill.totalAmount)} total | {money(bill.dueAmount)} due</h2>
                  <p className="mt-2 text-sm text-slate-500">Invoice {date(bill.invoiceDate)} | Payable {money(bill.patientPayableAmount)} | Insurance {bill.insuranceProvider || "Not provided"}</p>
                </div>
                <div className="flex flex-wrap gap-2"><button onClick={() => setSelected(bill)} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-50 px-4 text-sm font-bold text-blue-700"><Eye className="h-4 w-4" />View</button><button onClick={() => { setSelected(bill); setTimeout(() => window.print(), 100); }} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"><Printer className="h-4 w-4" />Print</button></div>
              </div>
            </article>
          ))}
        </section>
      </div>
      <DetailModal bill={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

export default function MyBilling() {
  return <div><Navbar /><MyBillingContent /><Footer /></div>;
}
