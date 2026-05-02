const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api/patient-bills`;

function query(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "All") {
      qs.set(key, value);
    }
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

export async function fetchMyBills(filters = {}, getToken) {
  const res = await fetch(`${API_BASE}/my${query(filters)}`, {
    headers: await patientHeaders(getToken),
  });
  return parse(res, "Unable to load billing records.");
}

export async function fetchMyBillById(id, getToken) {
  const res = await fetch(`${API_BASE}/my/${id}`, {
    headers: await patientHeaders(getToken),
  });
  return parse(res, "Unable to load billing record.");
}
