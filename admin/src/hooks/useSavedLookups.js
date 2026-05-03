import { useCallback, useEffect, useState } from "react";
import {
  fetchAdmissions,
  fetchAppointments,
  fetchDoctors,
  fetchPatients,
  fetchServiceAppointments,
  fetchStaff,
} from "../api/lookupApi";

const emptyLookups = {
  patients: [],
  doctors: [],
  staff: [],
  admissions: [],
  appointments: [],
  serviceAppointments: [],
};

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

export default function useSavedLookups({ authMode = "staff", getToken, includeStaff = false } = {}) {
  const [lookups, setLookups] = useState(emptyLookups);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState("");

  const loadLookups = useCallback(async () => {
    setLookupLoading(true);
    setLookupError("");
    const options = { authMode, getToken };
    const results = await Promise.allSettled([
      fetchPatients(options),
      fetchDoctors(options),
      fetchAdmissions(options),
      fetchAppointments(options),
      fetchServiceAppointments(options),
      includeStaff ? fetchStaff(options) : Promise.resolve([]),
    ]);
    const [patients, doctors, admissions, appointments, serviceAppointments, staff] =
      results.map((result) => (result.status === "fulfilled" ? arrayOrEmpty(result.value) : []));
    const failed = results.find((result) => result.status === "rejected");

    setLookups({ patients, doctors, admissions, appointments, serviceAppointments, staff });
    setLookupError(failed?.reason?.message || "");
    setLookupLoading(false);
  }, [authMode, getToken, includeStaff]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  return { lookups, lookupLoading, lookupError, reloadLookups: loadLookups };
}
