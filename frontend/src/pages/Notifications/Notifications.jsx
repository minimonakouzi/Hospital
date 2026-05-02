import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  MessageSquareText,
  Pill,
  ShieldPlus,
  Stethoscope,
} from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api`;

const statusFilters = ["All", "Unread", "Read"];
const typeFilters = ["All", "Appointment", "Prescription", "Report", "Ticket", "Billing", "System"];

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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeIcon(type = "System") {
  const icons = {
    Appointment: Stethoscope,
    Prescription: Pill,
    Report: FileText,
    Ticket: MessageSquareText,
    Billing: CircleDollarSign,
    System: Bell,
  };
  return icons[type] || Bell;
}

function typeTone(type = "System") {
  const tones = {
    Appointment: "bg-blue-50 text-blue-700 ring-blue-100",
    Prescription: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    Report: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    Ticket: "bg-violet-50 text-violet-700 ring-violet-100",
    Billing: "bg-amber-50 text-amber-700 ring-amber-100",
    System: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return tones[type] || tones.System;
}

function EmptyState({ title, text, icon = Bell }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#cbdcf6] bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#eef4fb] text-[#2563eb]">
        {React.createElement(icon, { className: "h-7 w-7" })}
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-[#0f172a]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748b]">{text}</p>
    </div>
  );
}

function StatusBadge({ read }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        read
          ? "bg-slate-100 text-slate-600 ring-slate-200"
          : "bg-blue-50 text-[#2563eb] ring-blue-100"
      }`}
    >
      {read ? "Read" : "Unread"}
    </span>
  );
}

function NotificationCard({ notification, markingId, onMarkRead, onView }) {
  const read = Boolean(notification.readAt);
  const Icon = typeIcon(notification.type);
  const created = formatDate(notification.createdAt);

  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm transition hover:border-[#bfd3f5] ${
        read ? "border-[#dbe6f7]" : "border-blue-200 shadow-[0_12px_36px_rgba(37,99,235,0.08)]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${typeTone(
            notification.type,
          )}`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${typeTone(notification.type)}`}>
              {notification.type || "System"}
            </span>
            <StatusBadge read={read} />
            {created ? <span className="text-xs font-semibold text-[#94a3b8]">{created}</span> : null}
          </div>

          <h2 className="mt-3 text-lg font-extrabold text-[#0f172a]">{notification.title || "Notification"}</h2>
          <p className="mt-2 text-sm leading-6 text-[#475569]">{notification.message || ""}</p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          {notification.link ? (
            <button
              type="button"
              onClick={() => onView(notification.link)}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-bold text-[#2563eb] transition hover:bg-[#f8fbff]"
            >
              View
            </button>
          ) : null}

          {!read ? (
            <button
              type="button"
              onClick={() => onMarkRead(itemId(notification))}
              disabled={markingId === itemId(notification)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {markingId === itemId(notification) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark as read
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function NotificationsContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      const params = new URLSearchParams();
      params.set("status", status);
      if (type !== "All") params.set("type", type);
      params.set("limit", "100");

      const res = await fetch(`${API_BASE}/patient-notifications/my?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Unable to load notifications. Please try again.");

      setNotifications(Array.isArray(body?.data) ? body.data : []);
      setUnreadCount(Number(body?.unreadCount || 0));
    } catch (err) {
      console.error("load notifications error:", err);
      setNotifications([]);
      setUnreadCount(0);
      setError(err?.message || "Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, status, type]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const visibleCount = notifications.length;
  const readCount = useMemo(
    () => notifications.filter((notification) => notification.readAt).length,
    [notifications],
  );

  async function markRead(id) {
    if (!id) return;
    try {
      setMarkingId(id);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/patient-notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Unable to mark notification as read.");

      setNotifications((current) =>
        current.map((item) => (itemId(item) === id ? { ...item, readAt: body?.data?.readAt || new Date().toISOString() } : item)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      window.dispatchEvent(new Event("revive:notifications-updated"));
    } catch (err) {
      console.error("mark notification read error:", err);
      setError(err?.message || "Unable to mark notification as read.");
    } finally {
      setMarkingId("");
    }
  }

  async function markAllRead() {
    try {
      setMarkingAll(true);
      setError("");
      const token = await getToken();
      const res = await fetch(`${API_BASE}/patient-notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Unable to mark notifications as read.");

      await loadNotifications();
      window.dispatchEvent(new Event("revive:notifications-updated"));
    } catch (err) {
      console.error("mark all notifications read error:", err);
      setError(err?.message || "Unable to mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  function viewLink(link) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) {
      window.location.href = link;
      return;
    }
    navigate(link.startsWith("/") ? link : `/${link}`);
  }

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-3xl border border-[#dbe6f7] bg-white p-10 text-sm font-semibold text-[#2563eb] shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading notifications...
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#dbe6f7] bg-white p-8 text-center shadow-sm">
          <ShieldPlus className="mx-auto h-11 w-11 text-[#2563eb]" />
          <h1 className="mt-4 text-3xl font-extrabold text-[#0f172a]">Notifications</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            Sign in to view updates about your hospital care.
          </p>
          <button
            type="button"
            onClick={() => clerk.openSignIn()}
            className="mt-6 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  const emptyTitle =
    status === "Unread"
      ? "No unread notifications."
      : status === "Read"
        ? "No read notifications yet."
        : "No notifications yet.";

  return (
    <main className="min-h-screen bg-[#eef6ff] px-4 pb-16 pt-28">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white/85 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1fr_280px] lg:px-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e6fb] bg-white px-4 py-2 text-sm font-bold text-[#2563eb]">
                <BellRing className="h-4 w-4" />
                Patient Updates
              </div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#0f172a] md:text-5xl">
                Notifications
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#64748b]">
                Stay updated about appointments, prescriptions, reports, tickets, and billing.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#dbe6f7] bg-[#eef4fb] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748b]">Unread</p>
              <p className="mt-2 text-4xl font-extrabold text-[#2563eb]">{unreadCount}</p>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                {unreadCount === 1 ? "notification needs" : "notifications need"} your attention.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                    status === item
                      ? "bg-[#2563eb] text-white"
                      : "border border-[#dbe6f7] bg-[#f8fbff] text-[#334155] hover:bg-white hover:text-[#2563eb]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-11 rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm font-bold text-[#334155] outline-none transition focus:border-blue-300 focus:bg-white"
              >
                {typeFilters.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? "All types" : item}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll || unreadCount === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark all as read
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div className="flex-1">{error || "Unable to load notifications. Please try again."}</div>
            <button type="button" onClick={loadNotifications} className="font-bold text-rose-800">
              Retry
            </button>
          </div>
        ) : null}

        <section className="grid gap-4">
          {visibleCount === 0 ? (
            <EmptyState
              icon={status === "Unread" ? CheckCircle2 : Bell}
              title={emptyTitle}
              text={
                status === "Unread"
                  ? "Everything is caught up."
                  : "Hospital updates will appear here when they are sent to your patient profile."
              }
            />
          ) : (
            notifications.map((notification) => (
              <NotificationCard
                key={itemId(notification)}
                notification={notification}
                markingId={markingId}
                onMarkRead={markRead}
                onView={viewLink}
              />
            ))
          )}
        </section>

        <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 text-sm text-[#64748b] shadow-sm">
          Showing {visibleCount} notification{visibleCount === 1 ? "" : "s"}.
          {readCount > 0 ? ` ${readCount} shown as read.` : ""}
          <Link to="/medical-records" className="ml-2 font-bold text-[#2563eb] hover:text-blue-700">
            View medical records
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Notifications() {
  return (
    <div>
      <Navbar />
      <NotificationsContent />
      <Footer />
    </div>
  );
}
