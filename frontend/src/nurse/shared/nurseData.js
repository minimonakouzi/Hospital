export const emptyDashboard = {
  counts: { checkIns: 0, appointments: 0, bookings: 0, vitals: 0 },
  todayDoctorAppointments: [],
  todayServiceAppointments: [],
  recentUpcomingAppointments: [],
  checkIns: [],
  vitals: [],
  meta: {},
};

export function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "N"
  );
}

export function formatDate(date = "") {
  if (!date) return "-";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getDashboardData(dashboard) {
  return {
    ...emptyDashboard,
    ...(dashboard || {}),
    counts: { ...emptyDashboard.counts, ...(dashboard?.counts || {}) },
    meta: { ...emptyDashboard.meta, ...(dashboard?.meta || {}) },
  };
}

export function combineTodayQueue(data) {
  return [
    ...(data.todayDoctorAppointments || []),
    ...(data.todayServiceAppointments || []),
  ].sort((a, b) => `${a.time || ""}`.localeCompare(`${b.time || ""}`));
}
