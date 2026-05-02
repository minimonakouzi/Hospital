import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";
import {
  createStaffBill,
  deleteStaffBill,
  fetchStaffBills,
  updateStaffBill,
  updateStaffBillInsurance,
  updateStaffBillPayment,
} from "../../api/staffBillingApi";

const billTypes = ["All", "Appointment", "Service", "Admission", "Lab", "Radiology", "Prescription", "Other"];
const paymentStatuses = ["All", "Unpaid", "Paid", "Partially Paid", "Refunded"];
const insuranceStatuses = ["All", "Not Provided", "Submitted", "Approved", "Rejected", "Pending"];
const createTypes = billTypes.slice(1);
const createPaymentStatuses = paymentStatuses.slice(1);
const createInsuranceStatuses = insuranceStatuses.slice(1);
const emptyItem = { title: "", quantity: 1, unitPrice: 0 };
const emptyForm = {
  patientId: "",
  billType: "Appointment",
  description: "",
  items: [{ ...emptyItem }],
  discount: 0,
  tax: 0,
  paymentStatus: "Unpaid",
  paymentMethod: "",
  paidAmount: 0,
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insuranceStatus: "Not Provided",
  insuranceCoverageAmount: 0,
  dueDate: "",
  notes: "",
};
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
const personName = (item = {}) => item?.name || item?.patientCode || item?.email || item?.phone || "Patient";

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

function Notice({ message, close }) {
  const ok = message.type === "success";
  return <div className={`flex justify-between rounded-2xl border p-4 text-sm font-bold ${ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}><span>{ok ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertCircle className="mr-2 inline h-4 w-4" />}{message.text}</span><button type="button" onClick={close}><X className="h-4 w-4" /></button></div>;
}

function payloadFrom(form) {
  const payload = { ...form };
  payload.items = (form.items || [])
    .filter((item) => String(item.title || "").trim())
    .map((item) => ({
      title: String(item.title || "").trim(),
      quantity: safeNumber(item.quantity || 0),
      unitPrice: safeNumber(item.unitPrice || 0),
    }));
  Object.keys(payload).forEach((key) => {
    if (payload[key] === "" || payload[key] === null || payload[key] === undefined) delete payload[key];
  });
  return payload;
}

function normalizeBill(bill = {}) {
  return {
    ...emptyForm,
    ...bill,
    patientId: idOf(bill.patientId) || bill.patientId || "",
    dueDate: bill.dueDate ? String(bill.dueDate).slice(0, 10) : "",
    items: Array.isArray(bill.items) && bill.items.length ? bill.items.map((item) => ({ title: item.title || "", quantity: item.quantity || 1, unitPrice: item.unitPrice || 0 })) : [{ ...emptyItem }],
  };
}

function printInvoice(bill) {
  const rows = (bill.items || []).map((item) => `<tr><td>${item.title || "-"}</td><td>${item.quantity || 0}</td><td>${money(item.unitPrice)}</td><td>${money(item.total)}</td></tr>`).join("");
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${bill.billCode || "Invoice"}</title><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:32px}h1{color:#2563eb}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border-bottom:1px solid #e2e8f0;padding:10px;text-align:left}.totals{margin-left:auto;margin-top:24px;max-width:360px}.totals div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0}.muted{color:#64748b}</style></head><body><h1>Revive Hospital Invoice</h1><p class="muted">${bill.billCode || ""} | ${date(bill.invoiceDate)} | Patient: ${personName(bill.patientId)}</p><h2>${bill.billType || "Bill"}</h2><p>${bill.description || ""}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No invoice items recorded.</td></tr>"}</tbody></table><div class="totals"><div><span>Subtotal</span><b>${money(bill.subtotal)}</b></div><div><span>Discount</span><b>${money(bill.discount)}</b></div><div><span>Tax</span><b>${money(bill.tax)}</b></div><div><span>Total</span><b>${money(bill.totalAmount)}</b></div><div><span>Insurance</span><b>${money(bill.insuranceCoverageAmount)}</b></div><div><span>Patient Payable</span><b>${money(bill.patientPayableAmount)}</b></div><div><span>Paid</span><b>${money(bill.paidAmount)}</b></div><div><span>Due</span><b>${money(bill.dueAmount)}</b></div></div><p class="muted">Payment: ${bill.paymentStatus || "-"} ${bill.paymentMethod ? `via ${bill.paymentMethod}` : ""}</p><p class="muted">Insurance: ${bill.insuranceProvider || "Not provided"} (${bill.insuranceStatus || "-"})</p><script>window.print();</script></body></html>`);
  win.document.close();
}

function BillForm({ form, setForm, onSubmit, saving, close, title }) {
  const preview = useMemo(() => {
    const items = (form.items || []).map((item) => ({
      ...item,
      quantity: safeNumber(item.quantity),
      unitPrice: safeNumber(item.unitPrice),
      total: safeNumber(item.quantity) * safeNumber(item.unitPrice),
    }));
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discount = safeNumber(form.discount);
    const tax = safeNumber(form.tax);
    const total = Math.max(subtotal - discount + tax, 0);
    const insurance = safeNumber(form.insuranceCoverageAmount);
    const payable = Math.max(total - insurance, 0);
    const paid = safeNumber(form.paidAmount);
    const due = form.paymentStatus === "Paid" ? 0 : Math.max(payable - paid, 0);
    return { items, subtotal, total, payable, due };
  }, [form]);

  function updateItem(index, key, value) {
    setForm((current) => {
      const items = [...(current.items || [])];
      items[index] = { ...emptyItem, ...items[index], [key]: key === "title" ? value : safeNumber(value) };
      return { ...current, items };
    });
  }
  function addItem() {
    setForm((current) => ({ ...current, items: [...(current.items || []), { ...emptyItem }] }));
  }
  function removeItem(index) {
    setForm((current) => {
      const items = [...(current.items || [])];
      items.splice(index, 1);
      return { ...current, items: items.length ? items : [{ ...emptyItem }] };
    });
  }
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center"><form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">Use a real patientId. Patient lookup can be added later.</p></div><button type="button" onClick={close}><X /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="patientId" required value={form.patientId} onChange={(v) => setForm((p) => ({ ...p, patientId: v }))} /><label className="grid gap-1 text-sm font-bold">Bill Type<Select value={form.billType} options={createTypes} onChange={(billType) => setForm((p) => ({ ...p, billType }))} /></label><Field label="description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} /><Field label="discount" type="number" value={form.discount} onChange={(v) => setForm((p) => ({ ...p, discount: v }))} /><Field label="tax" type="number" value={form.tax} onChange={(v) => setForm((p) => ({ ...p, tax: v }))} /><label className="grid gap-1 text-sm font-bold">Payment Status<Select value={form.paymentStatus} options={createPaymentStatuses} onChange={(paymentStatus) => setForm((p) => ({ ...p, paymentStatus }))} /></label><Field label="paymentMethod" value={form.paymentMethod} onChange={(v) => setForm((p) => ({ ...p, paymentMethod: v }))} /><Field label="paidAmount" type="number" value={form.paidAmount} onChange={(v) => setForm((p) => ({ ...p, paidAmount: v }))} /><Field label="insuranceProvider" value={form.insuranceProvider} onChange={(v) => setForm((p) => ({ ...p, insuranceProvider: v }))} /><Field label="insurancePolicyNumber" value={form.insurancePolicyNumber} onChange={(v) => setForm((p) => ({ ...p, insurancePolicyNumber: v }))} /><label className="grid gap-1 text-sm font-bold">Insurance Status<Select value={form.insuranceStatus} options={createInsuranceStatuses} onChange={(insuranceStatus) => setForm((p) => ({ ...p, insuranceStatus }))} /></label><Field label="insuranceCoverageAmount" type="number" value={form.insuranceCoverageAmount} onChange={(v) => setForm((p) => ({ ...p, insuranceCoverageAmount: v }))} /><Field label="dueDate" type="date" value={form.dueDate} onChange={(v) => setForm((p) => ({ ...p, dueDate: v }))} /><label className="grid gap-1 text-sm font-bold md:col-span-2">notes<textarea className={`${inputClass} min-h-20 py-3`} value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></label></div><div className="mt-5 rounded-3xl border border-[#dbe6f7] bg-[#f8fbff] p-4"><div className="flex items-center justify-between"><h3 className="font-black">Invoice Items</h3><button type="button" onClick={addItem} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100">Add Item</button></div><div className="mt-4 grid gap-3">{(form.items || []).map((item, index) => <div key={index} className="grid gap-3 rounded-2xl bg-white p-3 md:grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_auto]"><input className={inputClass} placeholder="Item title" value={item.title || ""} onChange={(e) => updateItem(index, "title", e.target.value)} /><input className={inputClass} type="number" min="0" placeholder="Qty" value={item.quantity || 0} onChange={(e) => updateItem(index, "quantity", e.target.value)} /><input className={inputClass} type="number" min="0" placeholder="Unit price" value={item.unitPrice || 0} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} /><div className="flex h-11 items-center rounded-2xl bg-[#f8fbff] px-4 text-sm font-black text-slate-700">{money(preview.items[index]?.total)}</div><button type="button" onClick={() => removeItem(index)} className="h-11 rounded-2xl bg-rose-50 px-3 text-xs font-bold text-rose-700">Remove</button></div>)}</div><div className="mt-4 grid gap-3 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700 sm:grid-cols-4"><div>Subtotal <span className="block text-blue-700">{money(preview.subtotal)}</span></div><div>Total <span className="block text-blue-700">{money(preview.total)}</span></div><div>Patient Payable <span className="block text-blue-700">{money(preview.payable)}</span></div><div>Estimated Due <span className="block text-rose-700">{money(preview.due)}</span></div></div></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={close} className="h-11 rounded-2xl border px-4 font-bold">Cancel</button><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 font-bold text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Save</button></div></form></div>;
}

function Field({ label, value, onChange, required = false, type = "text" }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<input type={type} required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function SmallModal({ title, children, onSubmit, close, saving }) {
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center"><form onSubmit={onSubmit} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-black">{title}</h2><button type="button" onClick={close}><X /></button></div><div className="mt-5 grid gap-4">{children}</div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={close} className="h-11 rounded-2xl border px-4 font-bold">Cancel</button><button disabled={saving} className="h-11 rounded-2xl bg-blue-600 px-4 font-bold text-white">Save</button></div></form></div>;
}

function Detail({ bill, close }) {
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-blue-700">{bill.billCode || "Invoice"}</p><h2 className="text-xl font-black text-slate-950">{personName(bill.patientId)} billing details</h2></div><div className="flex gap-2"><button type="button" onClick={() => printInvoice(bill)} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"><Printer className="h-4 w-4" />Print</button><button type="button" onClick={close}><X /></button></div></div><div className="mt-5 grid gap-3 md:grid-cols-2"><Info label="Bill Type" value={bill.billType} /><Info label="Patient" value={personName(bill.patientId)} /><Info label="Payment Status" value={bill.paymentStatus} /><Info label="Insurance Status" value={bill.insuranceStatus} /><Info label="Insurance Provider" value={bill.insuranceProvider || "-"} /><Info label="Policy Number" value={bill.insurancePolicyNumber || "-"} /><Info label="Invoice Date" value={date(bill.invoiceDate)} /><Info label="Due Date" value={date(bill.dueDate)} /><Info label="Description" value={bill.description || "-"} wide /></div><div className="mt-4 overflow-x-auto rounded-2xl border border-[#dbe6f7]"><table className="min-w-full text-sm"><thead className="bg-[#f8fbff]"><tr><th className="px-4 py-3 text-left">Item</th><th className="px-4 py-3 text-left">Qty</th><th className="px-4 py-3 text-left">Unit</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody>{(bill.items || []).length ? bill.items.map((item, index) => <tr key={index} className="border-t"><td className="px-4 py-3 font-bold">{item.title}</td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3">{money(item.unitPrice)}</td><td className="px-4 py-3 text-right font-black">{money(item.total)}</td></tr>) : <tr><td colSpan="4" className="px-4 py-4 text-slate-500">No items recorded.</td></tr>}</tbody></table></div><div className="mt-4 grid gap-3 md:grid-cols-4">{["subtotal","discount","tax","totalAmount","insuranceCoverageAmount","patientPayableAmount","paidAmount","dueAmount"].map((key) => <Stat key={key} label={key} value={money(bill[key])} />)}</div><Info label="Notes" value={bill.notes || "-"} wide /></div></div>;
}

function Info({ label, value, wide }) {
  return <div className={`rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 ${wide ? "md:col-span-2" : ""}`}><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-700">{value || "-"}</p></div>;
}

export function BillingWorkspace({ title = "Billing", subtitle, api, header = "staff" }) {
  const [bills, setBills] = useState([]);
  const [filters, setFilters] = useState({ search: "", billType: "All", paymentStatus: "All", insuranceStatus: "All" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [modal, setModal] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const body = await api.fetch(filters);
      setBills(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      setBills([]);
      setMessage({ type: "error", text: err.message || "Unable to load bills." });
    } finally {
      setLoading(false);
    }
  }, [api, filters]);
  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    total: bills.length,
    paid: bills.filter((b) => b.paymentStatus === "Paid").length,
    unpaid: bills.filter((b) => b.paymentStatus === "Unpaid").length,
    partial: bills.filter((b) => b.paymentStatus === "Partially Paid").length,
    revenue: bills.reduce((sum, b) => sum + safeNumber(b.paidAmount), 0),
    outstanding: bills.reduce((sum, b) => sum + safeNumber(b.dueAmount), 0),
  }), [bills]);

  function openCreate() { setForm(emptyForm); setModal("bill"); }
  function openEdit(bill) { setForm(normalizeBill(bill)); setModal("bill"); }
  function openPayment(bill) { setForm({ ...normalizeBill(bill), _id: idOf(bill) }); setModal("payment"); }
  function openInsurance(bill) { setForm({ ...normalizeBill(bill), _id: idOf(bill) }); setModal("insurance"); }

  async function saveBill(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const body = form._id ? await api.update(idOf(form), payloadFrom(form)) : await api.create(payloadFrom(form));
      setMessage({ type: "success", text: body.message || "Bill saved." });
      setModal("");
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Unable to save bill." });
    } finally { setSaving(false); }
  }
  async function savePayment(e) {
    e.preventDefault();
    try { setSaving(true); const body = await api.payment(idOf(form), { paymentStatus: form.paymentStatus, paymentMethod: form.paymentMethod, paidAmount: form.paidAmount }); setMessage({ type: "success", text: body.message || "Payment updated." }); setModal(""); await load(); }
    catch (err) { setMessage({ type: "error", text: err.message || "Unable to update payment." }); }
    finally { setSaving(false); }
  }
  async function saveInsurance(e) {
    e.preventDefault();
    try { setSaving(true); const body = await api.insurance(idOf(form), { insuranceProvider: form.insuranceProvider, insurancePolicyNumber: form.insurancePolicyNumber, insuranceStatus: form.insuranceStatus, insuranceCoverageAmount: form.insuranceCoverageAmount }); setMessage({ type: "success", text: body.message || "Insurance updated." }); setModal(""); await load(); }
    catch (err) { setMessage({ type: "error", text: err.message || "Unable to update insurance." }); }
    finally { setSaving(false); }
  }
  async function remove(bill) {
    if (!window.confirm(`Delete ${bill.billCode || "this bill"}?`)) return;
    try { setSaving(true); const body = await api.remove(idOf(bill)); setMessage({ type: "success", text: body.message || "Bill deleted." }); await load(); }
    catch (err) { setMessage({ type: "error", text: err.message || "Unable to delete bill." }); }
    finally { setSaving(false); }
  }

  const content = <div className="px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-5"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Stat label="Total Bills" value={summary.total} /><Stat label="Paid" value={summary.paid} /><Stat label="Unpaid" value={summary.unpaid} /><Stat label="Partial" value={summary.partial} /><Stat label="Revenue" value={money(summary.revenue)} /><Stat label="Outstanding" value={money(summary.outstanding)} /></section><section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm"><div className="grid gap-3 xl:grid-cols-[1fr_170px_170px_190px]"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-11`} value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search bills..." /></div><Select value={filters.billType} options={billTypes} onChange={(billType) => setFilters((p) => ({ ...p, billType }))} /><Select value={filters.paymentStatus} options={paymentStatuses} onChange={(paymentStatus) => setFilters((p) => ({ ...p, paymentStatus }))} /><Select value={filters.insuranceStatus} options={insuranceStatuses} onChange={(insuranceStatus) => setFilters((p) => ({ ...p, insuranceStatus }))} /></div></section>{message.text ? <Notice message={message} close={() => setMessage({ type: "", text: "" })} /> : null}<section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">{loading ? <div className="p-14 text-center text-sm font-bold text-blue-700"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Loading bills...</div> : bills.length === 0 ? <div className="p-14 text-center"><CreditCard className="mx-auto h-12 w-12 text-blue-700" /><h2 className="mt-3 font-black">No billing records found.</h2></div> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100 text-sm"><thead className="bg-[#f8fbff] text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-4 text-left">Invoice</th><th className="px-5 py-4 text-left">Patient</th><th className="px-5 py-4 text-left">Amounts</th><th className="px-5 py-4 text-left">Status</th><th className="px-5 py-4 text-left">Insurance</th><th className="px-5 py-4 text-left">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{bills.map((bill) => <tr key={idOf(bill)} className="align-top"><td className="px-5 py-4"><p className="font-black text-blue-700">{bill.billCode || "Invoice"}</p><p className="mt-1 font-bold text-slate-950">{bill.billType}</p><p className="text-xs text-slate-500">{date(bill.invoiceDate)}</p></td><td className="px-5 py-4">{personName(bill.patientId)}</td><td className="px-5 py-4"><p>Total {money(bill.totalAmount)}</p><p>Paid {money(bill.paidAmount)}</p><p className="font-black text-rose-700">Due {money(bill.dueAmount)}</p></td><td className="px-5 py-4"><Badge>{bill.paymentStatus}</Badge></td><td className="px-5 py-4"><p>{bill.insuranceProvider || "-"}</p><Badge>{bill.insuranceStatus}</Badge></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => setSelected(bill)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><Eye className="mr-1 inline h-3.5 w-3.5" />View</button><button onClick={() => printInvoice(bill)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Printer className="mr-1 inline h-3.5 w-3.5" />Print</button><button onClick={() => openEdit(bill)} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"><Pencil className="mr-1 inline h-3.5 w-3.5" />Edit</button><button onClick={() => openPayment(bill)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><CreditCard className="mr-1 inline h-3.5 w-3.5" />Payment</button><button onClick={() => openInsurance(bill)} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Insurance</button><button onClick={() => remove(bill)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button></div></td></tr>)}</tbody></table></div>}</section></div>{modal === "bill" ? <BillForm title={form._id ? "Edit Bill" : "Create Bill"} form={form} setForm={setForm} onSubmit={saveBill} saving={saving} close={() => setModal("")} /> : null}{modal === "payment" ? <SmallModal title="Update Payment" onSubmit={savePayment} close={() => setModal("")} saving={saving}><label className="grid gap-1 text-sm font-bold">Payment Status<Select value={form.paymentStatus} options={createPaymentStatuses} onChange={(paymentStatus) => setForm((p) => ({ ...p, paymentStatus }))} /></label><Field label="paymentMethod" value={form.paymentMethod} onChange={(v) => setForm((p) => ({ ...p, paymentMethod: v }))} /><Field label="paidAmount" type="number" value={form.paidAmount} onChange={(v) => setForm((p) => ({ ...p, paidAmount: v }))} /></SmallModal> : null}{modal === "insurance" ? <SmallModal title="Update Insurance" onSubmit={saveInsurance} close={() => setModal("")} saving={saving}><Field label="insuranceProvider" value={form.insuranceProvider} onChange={(v) => setForm((p) => ({ ...p, insuranceProvider: v }))} /><Field label="insurancePolicyNumber" value={form.insurancePolicyNumber} onChange={(v) => setForm((p) => ({ ...p, insurancePolicyNumber: v }))} /><label className="grid gap-1 text-sm font-bold">Insurance Status<Select value={form.insuranceStatus} options={createInsuranceStatuses} onChange={(insuranceStatus) => setForm((p) => ({ ...p, insuranceStatus }))} /></label><Field label="insuranceCoverageAmount" type="number" value={form.insuranceCoverageAmount} onChange={(v) => setForm((p) => ({ ...p, insuranceCoverageAmount: v }))} /></SmallModal> : null}{selected ? <Detail bill={selected} close={() => setSelected(null)} /> : null}</div>;

  if (header === "staff") {
    return <div><StaffPageHeader title={title} subtitle={subtitle} breadcrumb="Staff Portal / Billing" action={<button onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create Bill</button>} />{content}</div>;
  }
  return <div><div className="mb-5"><button onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create Bill</button></div>{content}</div>;
}

export default function StaffBilling() {
  const api = useMemo(() => ({
    fetch: fetchStaffBills,
    create: createStaffBill,
    update: updateStaffBill,
    payment: updateStaffBillPayment,
    insurance: updateStaffBillInsurance,
    remove: deleteStaffBill,
  }), []);
  return <BillingWorkspace title="Billing" subtitle="Create patient bills, update payment status, and manage insurance tracking." api={api} />;
}
