import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FlaskConical,
  Loader2,
  Phone,
  RefreshCw,
  Stethoscope,
  UserRound,
} from "lucide-react";
import {
  EmptyState,
  PageBody,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../nurse/shared/NurseUi";
import { formatDate } from "../../nurse/shared/nurseData";

const API_BASE = "http://localhost:4000/api";
const NURSE_TOKEN_KEY = "nurseToken_v1";

function CheckInBadge({ status }) {
  const checkedIn = status === "Checked In";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        checkedIn
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {checkedIn ? "Checked In" : "Not Checked In"}
    </span>
  );
}

function QueueCard({ item, updatingId, onCheckIn }) {
  const isService = item.type === "service";
  const title = isService
    ? item.serviceName || "Service booking"
    : item.doctorName || "Doctor appointment";
  const checkedIn = item.checkInStatus === "Checked In";
  const key = `${item.type}-${item.id}`;

  return (
    <article className="rounded-2xl border border-[#e2e8f0] bg-[#fbfdff] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4fb] text-[#2563eb]">
              {isService ? (
                <FlaskConical className="h-5 w-5" />
              ) : (
                <Stethoscope className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#0f172a]">
                {item.patientName || "Unnamed patient"}
              </p>
              <p className="truncate text-xs font-semibold text-[#2563eb]">
                {title}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge status={item.status} />
          <CheckInBadge status={item.checkInStatus} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[#64748b] sm:grid-cols-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
          <span className="truncate">{formatDate(item.date)}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
          <span className="truncate">{item.time || "-"}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
          <span className="truncate">{item.mobile || "No mobile"}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 sm:justify-end">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
          <span className="truncate">{isService ? "Service/Lab" : "Doctor"}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={checkedIn || updatingId === key}
          onClick={() => onCheckIn(item)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            checkedIn
              ? "cursor-not-allowed bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : "bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:bg-blue-300"
          }`}
        >
          {updatingId === key ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {checkedIn
            ? "Checked In"
            : updatingId === key
              ? "Checking in..."
              : "Mark Checked In"}
        </button>
      </div>
    </article>
  );
}

export default function NurseCheckIns() {
  const [queue, setQueue] = useState([]);
  const [counts, setCounts] = useState({ total: 0, checkedIn: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const token = localStorage.getItem(NURSE_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/nurses/check-ins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to load check-in queue.");
      }

      setQueue(Array.isArray(body?.data?.queue) ? body.data.queue : []);
      setCounts(body?.data?.counts || { total: 0, checkedIn: 0, pending: 0 });
    } catch (err) {
      console.error("load nurse check-ins error:", err);
      setQueue([]);
      setCounts({ total: 0, checkedIn: 0, pending: 0 });
      setMessage({
        type: "error",
        text: err?.message || "Unable to load check-in queue.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const metrics = useMemo(
    () => [
      ["Total", counts.total || queue.length],
      ["Pending", counts.pending || 0],
      ["Checked In", counts.checkedIn || 0],
    ],
    [counts, queue.length],
  );

  async function markCheckedIn(item) {
    const key = `${item.type}-${item.id}`;
    try {
      setUpdatingId(key);
      setMessage({ type: "", text: "" });
      const token = localStorage.getItem(NURSE_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/nurses/check-ins/${item.type}/${item.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to check in patient.");
      }

      setQueue((prev) =>
        prev.map((queueItem) =>
          queueItem.type === item.type && queueItem.id === item.id
            ? { ...queueItem, ...(body?.data || {}), checkInStatus: "Checked In" }
            : queueItem,
        ),
      );
      setCounts((prev) => ({
        total: prev.total || queue.length,
        checkedIn: (prev.checkedIn || 0) + (item.checkInStatus === "Checked In" ? 0 : 1),
        pending: Math.max(
          0,
          (prev.pending || 0) - (item.checkInStatus === "Checked In" ? 0 : 1),
        ),
      }));
      setMessage({
        type: "success",
        text: body?.message || "Patient checked in successfully.",
      });
    } catch (err) {
      console.error("mark checked in error:", err);
      setMessage({
        type: "error",
        text: err?.message || "Unable to check in patient.",
      });
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        eyebrow="Check-in Queue"
        title="Today's Patient Queue"
        subtitle="Doctor and service appointments ready for nurse check-in"
        action={
          <button
            type="button"
            onClick={loadQueue}
            className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-white px-4 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#f8fbff]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                {label}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#0f172a]">{value}</p>
            </div>
          ))}
        </div>

        {message.text ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.type === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-rose-100 bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <SectionCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Queue"
          subtitle={`${queue.length} item${queue.length === 1 ? "" : "s"} today`}
        >
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] px-4 py-10 text-sm font-semibold text-[#2563eb]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading check-in queue...
            </div>
          ) : queue.length ? (
            <div className="grid gap-3">
              {queue.map((item) => (
                <QueueCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  updatingId={updatingId}
                  onCheckIn={markCheckedIn}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No check-ins available"
              message="Today's appointment list is empty."
            />
          )}
        </SectionCard>
      </PageBody>
    </div>
  );
}
