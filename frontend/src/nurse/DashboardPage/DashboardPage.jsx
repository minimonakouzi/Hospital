import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Mail,
  Phone,
  Stethoscope,
  UserRound,
} from "lucide-react";
import {
  AppointmentList,
  EmptyState,
  InfoPill,
  MetricCard,
  PageBody,
  PageHeader,
  SectionCard,
} from "../shared/NurseUi";
import { getDashboardData, initials } from "../shared/nurseData";

export default function NurseDashboardPage() {
  const { nurse, dashboard } = useOutletContext();
  const data = getDashboardData(dashboard);
  const profile = data.nurse || nurse || {};
  const displayName = profile.name || "Nurse";
  const counts = data.counts;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        eyebrow="Nurse / Dashboard"
        title="Dashboard"
        subtitle="Review assigned care activity and today's schedule."
        action={
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-sm font-semibold text-[#2563eb]">
            <HeartPulse className="h-4 w-4" />
            {profile.department || "Nursing"} | {profile.shift || "Assigned"} shift
          </div>
        }
      />

      <PageBody>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Check-ins"
            value={counts.checkIns}
            icon={<ClipboardList className="h-5 w-5" />}
            tint="bg-[#e8eefc] text-[#3467d6]"
          />
          <MetricCard
            title="Appointments"
            value={counts.appointments}
            icon={<Stethoscope className="h-5 w-5" />}
            tint="bg-[#e7f7fb] text-[#0891b2]"
          />
          <MetricCard
            title="Bookings"
            value={counts.bookings}
            icon={<FlaskConical className="h-5 w-5" />}
            tint="bg-[#fff7e6] text-[#c47f10]"
          />
          <MetricCard
            title="Vitals"
            value={counts.vitals}
            icon={<Activity className="h-5 w-5" />}
            tint="bg-[#e8f7ef] text-[#0f9f6e]"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm lg:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2563eb] font-bold text-white">
                {initials(displayName)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-[#0f172a]">
                  {displayName}
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#2563eb]">
                  {profile.status || "Active"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoPill
                icon={<Mail className="h-3.5 w-3.5 text-[#2563eb]" />}
                label="Email"
                value={profile.email}
              />
              <InfoPill
                icon={<Phone className="h-3.5 w-3.5 text-[#2563eb]" />}
                label="Phone"
                value={profile.phone}
              />
              <InfoPill
                icon={<UserRound className="h-3.5 w-3.5 text-[#2563eb]" />}
                label="Department"
                value={profile.department}
              />
              <InfoPill
                icon={<Stethoscope className="h-3.5 w-3.5 text-[#2563eb]" />}
                label="Specialization"
                value={profile.specialization || "Not added"}
              />
            </div>
          </div>

          <SectionCard
            icon={<BadgeCheck className="h-5 w-5" />}
            title="Shift Summary"
            subtitle="Read-only daily overview"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoPill
                icon={<CalendarDays className="h-3.5 w-3.5 text-[#2563eb]" />}
                label="Shift"
                value={profile.shift}
              />
              <InfoPill
                icon={<HeartPulse className="h-3.5 w-3.5 text-[#2563eb]" />}
                label="Status"
                value={profile.status || "Active"}
              />
              <InfoPill
                icon={<Activity className="h-3.5 w-3.5 text-[#2563eb]" />}
                label="Experience"
                value={profile.experience || "Not added"}
              />
            </div>
          </SectionCard>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            icon={<Stethoscope className="h-5 w-5" />}
            title="Today's Doctor Appointments"
            subtitle="Read-only schedule"
          >
            <AppointmentList
              items={data.todayDoctorAppointments}
              emptyTitle="No doctor appointments today"
            />
          </SectionCard>

          <SectionCard
            icon={<FlaskConical className="h-5 w-5" />}
            title="Today's Service Bookings"
            subtitle="Service and lab schedule"
          >
            <AppointmentList
              items={data.todayServiceAppointments}
              emptyTitle="No service bookings today"
              emptyType="service"
            />
          </SectionCard>

          <SectionCard
            icon={<ClipboardList className="h-5 w-5" />}
            title="Check-in Queue"
            subtitle="Read-only queue"
          >
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No check-ins assigned"
            />
          </SectionCard>

          <SectionCard
            icon={<Activity className="h-5 w-5" />}
            title="Patient Vitals"
            subtitle="Read-only workspace"
          >
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title="No vitals recorded yet"
            />
          </SectionCard>
        </section>
      </PageBody>
    </div>
  );
}
