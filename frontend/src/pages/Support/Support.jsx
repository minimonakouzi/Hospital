import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldPlus,
  X,
} from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import {
  createSupportTicket,
  fetchMySupportTickets,
  replyToMySupportTicket,
} from "../../api/supportTicketApi";

const categories = [
  "Booking Problem",
  "Cancellation Help",
  "Payment Issue",
  "Medical Report",
  "General Question",
  "Other",
];
const priorities = ["Low", "Medium", "High", "Urgent"];
const statuses = ["All", "Open", "In Progress", "Resolved", "Closed"];
const emptyForm = {
  subject: "",
  category: "General Question",
  priority: "Medium",
  message: "",
};

function itemId(item = {}) {
  return item?._id || item?.id || "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>
      {children}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#0f172a]">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SupportContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({ status: "All", priority: "All", category: "All", search: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");

  const loadTickets = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setTickets([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const body = await fetchMySupportTickets(filters, getToken);
      setTickets(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error("load patient support tickets error:", err);
      setTickets([]);
      setError(err?.message || "Unable to load support tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters, getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const summary = useMemo(() => {
    return {
      open: tickets.filter((item) => item.status === "Open").length,
      active: tickets.filter((item) => ["Open", "In Progress"].includes(item.status)).length,
      total: tickets.length,
    };
  }, [tickets]);

  async function submitTicket(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const body = await createSupportTicket(form, getToken);
      setNotice(body?.message || "Support ticket created.");
      setCreateOpen(false);
      setForm(emptyForm);
      await loadTickets();
    } catch (err) {
      setError(err?.message || "Unable to create support ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReply(event) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    try {
      setSaving(true);
      setError("");
      const body = await replyToMySupportTicket(itemId(selected), { message: reply }, getToken);
      setReply("");
      setSelected(body?.data || selected);
      setNotice(body?.message || "Reply sent.");
      await loadTickets();
    } catch (err) {
      setError(err?.message || "Unable to send reply. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28">
        <div className="mx-auto flex max-w-4xl items-center justify-center rounded-3xl border border-[#dbe6f7] bg-white p-10 text-sm font-semibold text-[#2563eb] shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading support tickets...
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#dbe6f7] bg-white p-8 text-center shadow-sm">
          <ShieldPlus className="mx-auto h-11 w-11 text-[#2563eb]" />
          <h1 className="mt-4 text-3xl font-extrabold text-[#0f172a]">Help Desk</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">Sign in to contact hospital support.</p>
          <button type="button" onClick={() => clerk.openSignIn()} className="mt-6 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white">
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e6fb] bg-white px-4 py-2 text-sm font-bold text-[#2563eb]">
                <HelpCircle className="h-4 w-4" />
                Patient Support
              </div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#0f172a] md:text-5xl">Help Desk</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#64748b]">
                Get help with bookings, cancellations, payments, reports, and general hospital questions.
              </p>
            </div>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">
              <Plus className="h-5 w-5" />
              New Ticket
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Stat label="Total Tickets" value={summary.total} icon={MessageSquareText} />
          <Stat label="Open Tickets" value={summary.open} icon={Clock3} />
          <Stat label="Active Requests" value={summary.active} icon={AlertCircle} />
        </section>

        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_170px_170px_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] pl-11 pr-4 text-sm outline-none focus:border-blue-300 focus:bg-white" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search ticket code, subject, message..." />
            </div>
            <FilterSelect value={filters.status} onChange={(status) => setFilters((p) => ({ ...p, status }))} options={statuses} />
            <FilterSelect value={filters.priority} onChange={(priority) => setFilters((p) => ({ ...p, priority }))} options={["All", ...priorities]} />
            <FilterSelect value={filters.category} onChange={(category) => setFilters((p) => ({ ...p, category }))} options={["All", ...categories]} />
          </div>
        </section>

        {notice ? <Notice type="success" text={notice} onClose={() => setNotice("")} /> : null}
        {error ? <Notice type="error" text={error} onClose={() => setError("")} /> : null}

        <section className="grid gap-4">
          {tickets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cbdcf6] bg-white px-6 py-12 text-center shadow-sm">
              <HelpCircle className="mx-auto h-12 w-12 text-[#2563eb]" />
              <h2 className="mt-4 text-xl font-extrabold text-[#0f172a]">No support tickets found.</h2>
              <p className="mt-2 text-sm text-[#64748b]">Create a ticket when you need help from the hospital team.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <button key={itemId(ticket)} type="button" onClick={() => setSelected(ticket)} className="rounded-3xl border border-[#dbe6f7] bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-[#2563eb]">{ticket.ticketCode || "Ticket"}</span>
                      <Badge className={statusClass(ticket.status)}>{ticket.status || "Open"}</Badge>
                      <Badge className={priorityClass(ticket.priority)}>{ticket.priority || "Medium"}</Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-extrabold text-[#0f172a]">{ticket.subject || "Support request"}</h2>
                    <p className="mt-2 text-sm text-[#64748b]">{ticket.category || "General Question"} | {ticket.messages?.length || 0} message{ticket.messages?.length === 1 ? "" : "s"}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-400">{formatDate(ticket.updatedAt || ticket.createdAt)}</p>
                </div>
              </button>
            ))
          )}
        </section>
      </div>

      {createOpen ? (
        <Modal title="Create Support Ticket" subtitle="Send your request to the hospital support team." onClose={() => setCreateOpen(false)}>
          <form onSubmit={submitTicket} className="grid gap-4 p-5">
            <Field label="Subject"><input required className={inputClass} value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category"><select className={inputClass} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></Field>
            </div>
            <Field label="Message"><textarea required className={`${inputClass} min-h-32 py-3`} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} /></Field>
            <ModalActions saving={saving} onCancel={() => setCreateOpen(false)} submitLabel="Create Ticket" />
          </form>
        </Modal>
      ) : null}

      {selected ? (
        <TicketModal ticket={selected} reply={reply} setReply={setReply} saving={saving} onClose={() => setSelected(null)} onSubmit={submitReply} />
      ) : null}
    </main>
  );
}

const inputClass = "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white";

function Field({ label, children }) {
  return <label className="grid gap-1.5 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>;
}

function FilterSelect({ value, onChange, options }) {
  return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select>;
}

function Stat({ label, value, icon }) {
  return <div className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><span className="rounded-2xl bg-blue-50 p-3 text-[#2563eb]">{React.createElement(icon, { className: "h-5 w-5" })}</span></div><p className="mt-3 text-3xl font-black text-[#0f172a]">{value}</p></div>;
}

function Notice({ type, text, onClose }) {
  const good = type === "success";
  return <div className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold ${good ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}><span>{text}</span><button type="button" onClick={onClose}><X className="h-4 w-4" /></button></div>;
}

function ModalActions({ saving, onCancel, submitLabel }) {
  return <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">Cancel</button><button disabled={saving} type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white disabled:opacity-70">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitLabel}</button></div>;
}

function TicketModal({ ticket, reply, setReply, saving, onClose, onSubmit }) {
  const closed = ticket.status === "Closed";
  return (
    <Modal title={`${ticket.ticketCode || "Ticket"} - ${ticket.subject || "Support request"}`} subtitle={`${ticket.category || "General Question"} | ${ticket.status || "Open"}`} onClose={onClose}>
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap gap-2"><Badge className={statusClass(ticket.status)}>{ticket.status || "Open"}</Badge><Badge className={priorityClass(ticket.priority)}>{ticket.priority || "Medium"}</Badge></div>
        <div className="grid max-h-[45vh] gap-3 overflow-y-auto rounded-3xl bg-[#f8fbff] p-4">
          {(ticket.messages || []).length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : ticket.messages.map((message, index) => (
            <div key={`${message.createdAt}-${index}`} className={`rounded-2xl p-4 ${message.senderType === "Patient" ? "bg-white" : "bg-blue-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-[#0f172a]">{message.senderName || message.senderType || "User"}</p><p className="text-xs font-semibold text-slate-400">{formatDate(message.createdAt)}</p></div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{message.message || ""}</p>
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="grid gap-3">
          <textarea disabled={closed} className={`${inputClass} min-h-24 py-3 disabled:opacity-60`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={closed ? "Closed tickets cannot receive replies." : "Write a reply..."} />
          <div className="flex justify-end"><button disabled={saving || closed || !reply.trim()} type="submit" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send Reply</button></div>
        </form>
      </div>
    </Modal>
  );
}

export default function Support() {
  return (
    <div>
      <Navbar />
      <SupportContent />
      <Footer />
    </div>
  );
}
