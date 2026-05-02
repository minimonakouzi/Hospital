import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  FlaskConical,
  Stethoscope,
} from "lucide-react";
import {
  AppointmentList,
  PageBody,
  PageHeader,
  SectionCard,
} from "../../nurse/shared/NurseUi";
import { getDashboardData } from "../../nurse/shared/nurseData";

const tabs = [
  { id: "doctors", label: "Doctor Appointments", icon: Stethoscope },
  { id: "services", label: "Service/Lab Bookings", icon: FlaskConical },
  { id: "upcoming", label: "Upcoming", icon: Clock3 },
];

export default function NurseBookings() {
  const { dashboard } = useOutletContext();
  const data = getDashboardData(dashboard);
  const [activeTab, setActiveTab] = useState("doctors");

  const tabData = useMemo(
    () => ({
      doctors: {
        title: "Doctor Appointments",
        subtitle: "Today's doctor schedule",
        icon: <Stethoscope className="h-5 w-5" />,
        items: data.todayDoctorAppointments,
        emptyTitle: "No doctor appointments today",
        emptyType: "doctor",
      },
      services: {
        title: "Service/Lab Bookings",
        subtitle: "Today's service and lab schedule",
        icon: <FlaskConical className="h-5 w-5" />,
        items: data.todayServiceAppointments,
        emptyTitle: "No service bookings today",
        emptyType: "service",
      },
      upcoming: {
        title: "Upcoming",
        subtitle: "Next active appointments and bookings",
        icon: <Clock3 className="h-5 w-5" />,
        items: data.recentUpcomingAppointments,
        emptyTitle: "No upcoming appointments",
        emptyType: "doctor",
      },
    }),
    [data],
  );

  const current = tabData[activeTab];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        eyebrow="Bookings"
        title="Appointments and Service Bookings"
        subtitle="Read-only view of nurse-relevant scheduling"
      />

      <PageBody>
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-2 shadow-sm">
          <div className="grid gap-2 md:grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                    selected
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "bg-[#f8fbff] text-[#475569] hover:bg-[#eef4fb]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
              Doctor Appointments
            </p>
            <p className="mt-2 text-2xl font-bold text-[#0f172a]">
              {data.todayDoctorAppointments.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
              Service Bookings
            </p>
            <p className="mt-2 text-2xl font-bold text-[#0f172a]">
              {data.todayServiceAppointments.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
              Upcoming
            </p>
            <p className="mt-2 text-2xl font-bold text-[#0f172a]">
              {data.recentUpcomingAppointments.length}
            </p>
          </div>
        </section>

        <SectionCard
          icon={current.icon || <CalendarDays className="h-5 w-5" />}
          title={current.title}
          subtitle={current.subtitle}
        >
          <AppointmentList
            items={current.items}
            emptyTitle={current.emptyTitle}
            emptyType={current.emptyType}
          />
        </SectionCard>
      </PageBody>
    </div>
  );
}
