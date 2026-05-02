import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  Activity,
  Gauge,
  HeartPulse,
  Thermometer,
  Weight,
  Wind,
} from "lucide-react";
import {
  EmptyState,
  PageBody,
  PageHeader,
  SectionCard,
} from "../../nurse/shared/NurseUi";
import {
  combineTodayQueue,
  getDashboardData,
} from "../../nurse/shared/nurseData";

const vitals = [
  {
    label: "Blood Pressure",
    value: "--/--",
    unit: "mmHg",
    icon: HeartPulse,
    tint: "bg-[#e8eefc] text-[#3467d6]",
  },
  {
    label: "Pulse",
    value: "--",
    unit: "bpm",
    icon: Gauge,
    tint: "bg-[#e8f7ef] text-[#0f9f6e]",
  },
  {
    label: "Temperature",
    value: "--",
    unit: "C",
    icon: Thermometer,
    tint: "bg-[#fff7e6] text-[#c47f10]",
  },
  {
    label: "Oxygen",
    value: "--",
    unit: "%",
    icon: Wind,
    tint: "bg-[#e7f7fb] text-[#0891b2]",
  },
  {
    label: "Weight",
    value: "--",
    unit: "kg",
    icon: Weight,
    tint: "bg-[#f1f5f9] text-[#475569]",
  },
];

function VitalCard({ vital }) {
  const Icon = vital.icon;
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#0f172a]">
            {vital.label}
          </p>
          <p className="mt-2 text-2xl font-bold leading-none text-[#0f172a]">
            {vital.value}
            <span className="ml-1 text-xs font-semibold text-[#64748b]">
              {vital.unit}
            </span>
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${vital.tint}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function NurseVitals() {
  const { dashboard } = useOutletContext();
  const data = getDashboardData(dashboard);
  const todaysPatients = combineTodayQueue(data);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        eyebrow="Vitals"
        title="Vitals Workspace"
        subtitle="Read-only patient vitals overview"
      />

      <PageBody>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {vitals.map((vital) => (
            <VitalCard key={vital.label} vital={vital} />
          ))}
        </section>

        <SectionCard
          icon={<Activity className="h-5 w-5" />}
          title="Vitals Records"
          subtitle={`${todaysPatients.length} patient${todaysPatients.length === 1 ? "" : "s"} on today's schedule`}
        >
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title="No vitals recorded yet"
          />
        </SectionCard>
      </PageBody>
    </div>
  );
}
