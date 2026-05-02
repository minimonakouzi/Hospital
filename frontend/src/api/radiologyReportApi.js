const API_ROOT = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api/radiology-reports`;
const DOCTOR_TOKEN_KEY = "doctorToken_v1";

function query(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "All") qs.set(key, value);
  });
  const text = qs.toString();
  return text ? `?${text}` : "";
}

async function parse(res, fallback) {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || fallback || `Request failed (${res.status})`);
  return body;
}

async function patientHeaders(getToken, headers = {}) {
  const token = await getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

function doctorHeaders(headers = {}) {
  const token = localStorage.getItem(DOCTOR_TOKEN_KEY);
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

export async function fetchMyRadiologyReports(filters, getToken) {
  const res = await fetch(`${API_BASE}/my${query(filters)}`, { headers: await patientHeaders(getToken) });
  return parse(res, "Unable to load radiology reports.");
}

export async function fetchDoctorRadiologyReports(filters = {}) {
  const res = await fetch(`${API_BASE}/doctor${query(filters)}`, { headers: doctorHeaders() });
  return parse(res, "Unable to load radiology reports.");
}

export async function createDoctorRadiologyReport(payload) {
  const res = await fetch(`${API_BASE}/doctor`, {
    method: "POST",
    headers: doctorHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to create radiology report.");
}
