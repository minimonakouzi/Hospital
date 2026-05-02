import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareText,
  Search,
  Send,
  UserCheck,
  X,
} from "lucide-react";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";
import {
  assignSupportTicket,
  fetchSupportTickets,
  replyToSupportTicket,
  updateSupportTicketPriority,
  updateSupportTicketStatus,
} from "../../api/staffSupportTicketApi";

const statuses = ["All", "Open", "In Progress", "Resolved", "Closed"];
const priorities = ["All", "Low", "Medium", "High", "Urgent"];
const categories = ["All", "Booking Problem", "Cancellation Help", "Payment Issue", "Medical Report", "General Question", "Other"];
const inputClass = "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white";

function itemId(item = {}) {
  return item?._id || item?.id || "";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function patientName(patient = {}) {
  return patient?.name || patient?.email || patient?.phone || patient?.patientCode || "Patient";
}

function statusClass(status = "") {
  if (status === "Open") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "In Progress") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "Resolved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Closed") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function priorityClass(priority = "") {
  if (priority === "Urgent") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (priority === "High") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (priority === "Low") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function Badge({ children, className }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>{children}</span>;
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function StaffSupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({ status: "All", priority: "All", category: "All", search: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const body = await fetchSupportTickets(filters);
      setTickets(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error("load staff support tickets error:", err);
      setTickets([]);
      setMessage({ type: "error", text: err?.message || "Unable to load support tickets." });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const summary = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status === "Open").length,
    progress: tickets.filter((ticket) => ticket.status === "In Progress").length,
    resolved: tickets.filter((ticket) => ticket.status === "Resolved").length,
    urgent: tickets.filter((ticket) => ticket.priority === "Urgent").length,
  }), [tickets]);

  async function runAction(action, successText) {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const body = await action();
      setSelected(body?.data || selected);
      setMessage({ type: "success", text: body?.message || successText });
      await loadTickets();
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Action failed." });
    } finally {
      setSaving(false);
    }
  }

  function submitReply(event) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    runAction(async () => {
      const body = await replyToSupportTicket(itemId(selected), { message: reply });
      setReply("");
      return body;
    }, "Reply sent.");
  }

  return (
    <div>
      <StaffPageHeader
        title="Support Tickets"
        subtitle="Manage patient help requests, booking issues, and hospital support inquiries."
        breadcrumb="Staff Portal / Support Tickets"
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Open Tickets" value={summary.open} icon={MessageSquareText} />
            <Stat label="In Progress" value={summary.progress} icon={Clock3} />
            <Stat label="Resolved" value={summary.resolved} icon={CheckCircle2} />
            <Stat label="Urgent" value={summary.urgent} icon={AlertCircle} danger />
          </section>

          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_190px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className={`${inputClass} pl-11`} value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search ticket, patient, message..." />
              </div>
              <Select value={filters.status} onChange={(status) => setFilters((p) => ({ ...p, status }))} options={statuses} />
              <Select value={filters.priority} onChange={(priority) => setFilters((p) => ({ ...p, priority }))} options={priorities} />
              <Select value={filters.category} onChange={(category) => setFilters((p) => ({ ...p, category }))} options={categories} />
            </div>
          </section>

          {message.text ? <Notice message={message} onClose={() => setMessage({ type: "", text: "" })} /> : null}

          <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-16 text-sm font-bold text-blue-700"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading support tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <MessageSquareText className="mx-auto h-12 w-12 text-blue-700" />
                <h2 className="mt-4 text-lg font-bold text-slate-950">No support tickets found</h2>
                <p className="mt-1 text-sm text-slate-500">Patient help requests will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-[#f8fbff] text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr><th className="px-5 py-4">Ticket</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Priority</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((ticket) => (
                      <tr key={itemId(ticket)} className="hover:bg-[#f8fbff]">
                        <td className="px-5 py-4"><p className="font-black text-blue-700">{ticket.ticketCode || "Ticket"}</p><p className="mt-1 max-w-xs truncate font-semibold text-slate-800">{ticket.subject || "Support request"}</p><p className="mt-1 text-xs text-slate-500">{ticket.category || "General Question"}</p></td>
                        <td className="px-5 py-4"><p className="font-semibold text-slate-800">{patientName(ticket.patientId)}</p><p className="mt-1 text-xs text-slate-500">{ticket.patientId?.patientCode || ""}</p></td>
                        <td className="px-5 py-4"><Badge className={statusClass(ticket.status)}>{ticket.status || "Open"}</Badge></td>
                        <td className="px-5 py-4"><Badge className={priorityClass(ticket.priority)}>{ticket.priority || "Medium"}</Badge></td>
                        <td className="px-5 py-4 text-slate-500">{formatDate(ticket.updatedAt || ticket.createdAt)}</td>
                        <td className="px-5 py-4"><button type="button" onClick={() => setSelected(ticket)} className="rounded-2xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {selected ? (
        <TicketModal
          ticket={selected}
          reply={reply}
          setReply={setReply}
          saving={saving}
          onClose={() => setSelected(null)}
          onSubmit={submitReply}
          onStatus={(status) => runAction(() => updateSupportTicketStatus(itemId(selected), status), "Status updated.")}
          onPriority={(priority) => runAction(() => updateSupportTicketPriority(itemId(selected), priority), "Priority updated.")}
          onAssign={() => runAction(() => assignSupportTicket(itemId(selected)), "Ticket assigned.")}
        />
      ) : null}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select>;
}

function Stat({ label, value, icon, danger = false }) {
  return <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><span className={`rounded-2xl p-3 ${danger ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>{React.createElement(icon, { className: "h-5 w-5" })}</span></div><p className="mt-3 text-2xl font-black text-slate-950">{value}</p></div>;
}

function Notice({ message, onClose }) {
  const good = message.type === "success";
  return <div className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${good ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}><span>{message.text}</span><button type="button" onClick={onClose}><X className="h-4 w-4" /></button></div>;
}

function TicketModal({ ticket, reply, setReply, saving, onClose, onSubmit, onStatus, onPriority, onAssign }) {
  const closed = ticket.status === "Closed";
  return (
    <Modal title={`${ticket.ticketCode || "Ticket"} - ${ticket.subject || "Support request"}`} subtitle={`${patientName(ticket.patientId)} | ${ticket.category || "General Question"}`} onClose={onClose}>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-3">
          <div className="max-h-[52vh] overflow-y-auto rounded-3xl bg-[#f8fbff] p-4">
            {(ticket.messages || []).length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : ticket.messages.map((message, index) => (
              <div key={`${message.createdAt}-${index}`} className={`mb-3 rounded-2xl p-4 ${message.senderType === "Staff" ? "bg-blue-50" : "bg-white"}`}>
                <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-black text-slate-950">{message.senderName || message.senderType || "User"}</p><p className="text-xs font-semibold text-slate-400">{formatDate(message.createdAt)}</p></div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{message.message || ""}</p>
              </div>
            ))}
          </div>
          <form onSubmit={onSubmit} className="grid gap-3">
            <textarea disabled={closed} className={`${inputClass} min-h-24 py-3 disabled:opacity-60`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={closed ? "Closed tickets cannot receive replies." : "Write a staff reply..."} />
            <button disabled={saving || closed || !reply.trim()} type="submit" className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send Reply</button>
          </form>
        </div>
        <aside className="grid content-start gap-4 rounded-3xl border border-[#dbe6f7] bg-white p-4">
          <div><p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Status</p><Select value={ticket.status || "Open"} onChange={onStatus} options={statuses.filter((item) => item !== "All")} /></div>
          <div><p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Priority</p><Select value={ticket.priority || "Medium"} onChange={onPriority} options={priorities.filter((item) => item !== "All")} /></div>
          <button type="button" disabled={saving} onClick={onAssign} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60"><UserCheck className="h-4 w-4" />Assign to me</button>
          <div className="rounded-2xl bg-[#f8fbff] p-4 text-sm text-slate-600">
            <p className="font-black text-slate-900">Assigned</p>
            <p className="mt-1">{ticket.assignedStaffId?.name || "Unassigned"}</p>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
