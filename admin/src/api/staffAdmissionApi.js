const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";

const STAFF_TOKEN_KEY = "staffToken_v1";

function staffHeaders(headers = {}) {
  const token = localStorage.getItem(STAFF_TOKEN_KEY);
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseResponse(res, fallbackMessage) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message || fallbackMessage || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchAdmissions(filters = {}) {
  const res = await fetch(`${API_BASE}/api/admissions${buildQuery(filters)}`, {
    headers: staffHeaders(),
  });
  return parseResponse(res, "Failed to load admissions.");
}

export async function fetchAdmissionStats() {
  const res = await fetch(`${API_BASE}/api/admissions/stats`, {
    headers: staffHeaders(),
  });
  return parseResponse(res, "Failed to load admission stats.");
}

export async function admitPatient(payload) {
  const res = await fetch(`${API_BASE}/api/admissions/admit`, {
    method: "POST",
    headers: staffHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, "Failed to admit patient.");
}

export async function transferAdmission(id, payload) {
  const res = await fetch(`${API_BASE}/api/admissions/${id}/transfer`, {
    method: "PUT",
    headers: staffHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, "Failed to transfer admission.");
}

export async function dischargeAdmission(id, payload) {
  const res = await fetch(`${API_BASE}/api/admissions/${id}/discharge`, {
    method: "PUT",
    headers: staffHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, "Failed to discharge admission.");
}

export async function fetchWardBoard(filters = {}) {
  const res = await fetch(`${API_BASE}/api/wards${buildQuery(filters)}`, {
    headers: staffHeaders(),
  });
  return parseResponse(res, "Failed to load ward bed board.");
}

export async function fetchWardStats() {
  const res = await fetch(`${API_BASE}/api/wards/stats/summary`, {
    headers: staffHeaders(),
  });
  return parseResponse(res, "Failed to load ward stats.");
}

export async function fetchDoctors() {
  const res = await fetch(`${API_BASE}/api/doctors`);
  return parseResponse(res, "Failed to load doctors.");
}

export async function fetchPatientLookups(params = {}) {
  const res = await fetch(`${API_BASE}/api/admissions/lookups/patients${buildQuery(params)}`, {
    headers: staffHeaders(),
  });
  return parseResponse(res, "Failed to load patient lookup data.");
}

export async function fetchNurseLookups(params = {}) {
  const res = await fetch(`${API_BASE}/api/admissions/lookups/nurses${buildQuery(params)}`, {
    headers: staffHeaders(),
  });
  return parseResponse(res, "Failed to load nurse lookup data.");
}
