import React from "react";
import {
  CalendarDays,
  Clock3,
  FlaskConical,
  Stethoscope,
} from "lucide-react";
import { formatDate } from "./nurseData";

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="border-b border-[#dbe6f7] bg-white/95 px-4 py-5 shadow-[0_1px_0_rgba(15,23,42,0.02)] lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
            {eyebrow}
          </p>
          <div className="mb-2 h-1 w-10 rounded-full bg-[#2563eb]" />
          <h1 className="truncate text-2xl font-bold tracking-tight text-[#0f172a] sm:text-[1.7rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#64748b]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function PageBody({ children }) {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">{children}</div>
    </main>
  );
}

export function SectionCard({ icon, title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm transition duration-200 hover:shadow-md lg:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4fb] text-[#2563eb]">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[#0f172a]">
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate text-sm text-[#64748b]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, message }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-[#f8fbff] px-4 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-bold text-[#0f172a]">{title}</h3>
      {message ? (
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#64748b]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "Pending").toLowerCase();
  const tone =
    normalized === "completed" || normalized === "complete"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : normalized === "confirmed" || normalized === "in progress"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : normalized === "cancelled" || normalized === "canceled"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : normalized === "pending"
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${tone}`}
    >
      {status || "Pending"}
    </span>
  );
}

export function MetricCard({ title, value, icon, tint }) {
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold leading-none text-[#0f172a]">
            {value ?? 0}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tint}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function InfoPill({ icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-3 py-3 transition duration-200 hover:bg-white hover:shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-[#0f172a]">
        {value || "-"}
      </p>
    </div>
  );
}

export function AppointmentCard({ appointment, compact = false }) {
  const isService = appointment?.type === "service";
  const title = isService
    ? appointment.serviceName || "Service booking"
    : appointment.doctorName || "Doctor appointment";
  const detail = isService
    ? "Service/Lab"
    : appointment.speciality || "Doctor visit";

  return (
    <article className="rounded-2xl border border-[#dbe6f7] bg-[#fbfdff] p-3 transition duration-200 hover:bg-white hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#0f172a]">
            {appointment.patientName || "Unnamed patient"}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-[#2563eb]">
            {title}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div
        className={`mt-3 grid gap-2 text-xs text-[#64748b] ${
          compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
          <span className="truncate">{formatDate(appointment.date)}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
          <span className="truncate">{appointment.time || "-"}</span>
        </div>
        <div className="truncate">{appointment.mobile || "No mobile"}</div>
        <div className="truncate font-semibold text-[#0f172a] sm:text-right">
          {detail}
        </div>
      </div>
      {appointment.paymentStatus ? (
        <p className="mt-2 text-xs font-semibold text-[#64748b]">
          Payment: {appointment.paymentStatus}
        </p>
      ) : null}
    </article>
  );
}

export function AppointmentList({ items, emptyTitle, emptyType = "doctor" }) {
  if (!items?.length) {
    return (
      <EmptyState
        icon={
          emptyType === "service" ? (
            <FlaskConical className="h-5 w-5" />
          ) : (
            <Stethoscope className="h-5 w-5" />
          )
        }
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((appointment) => (
        <AppointmentCard
          key={`${appointment.type}-${appointment.id}`}
          appointment={appointment}
          compact
        />
      ))}
    </div>
  );
}
