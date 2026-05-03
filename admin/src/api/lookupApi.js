import { adminAuthHeaders } from "../utils/adminAuthHeaders";
import { staffAuthHeaders } from "../utils/staffAuthHeaders";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api/lookups`;

async function headersFor(authMode = "staff", getToken) {
  return authMode === "admin" ? adminAuthHeaders(getToken) : staffAuthHeaders();
}

async function fetchLookup(type, options = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  const query = params.toString() ? `?${params}` : "";
  const res = await fetch(`${API_BASE}/${type}${query}`, {
    headers: await headersFor(options.authMode, options.getToken),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message || "Unable to load saved lookup data.");
  }
  return Array.isArray(body?.data) ? body.data : [];
}

export function fetchPatients(options) {
  return fetchLookup("patients", options);
}

export function fetchDoctors(options) {
  return fetchLookup("doctors", options);
}

export function fetchStaff(options) {
  return fetchLookup("staff", options);
}

export function fetchAdmissions(options) {
  return fetchLookup("admissions", options);
}

export function fetchAppointments(options) {
  return fetchLookup("appointments", options);
}

export function fetchServiceAppointments(options) {
  return fetchLookup("service-appointments", options);
}

export function fetchServices(options) {
  return fetchLookup("services", options);
}
