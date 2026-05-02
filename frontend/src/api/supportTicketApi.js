const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api/support-tickets`;

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "All") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseResponse(res, fallbackMessage) {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || fallbackMessage || `Request failed (${res.status})`);
  return body;
}

async function authHeaders(getToken, headers = {}) {
  const token = await getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

export async function fetchMySupportTickets(filters, getToken) {
  const res = await fetch(`${API_BASE}/my${buildQuery(filters)}`, {
    headers: await authHeaders(getToken),
  });
  return parseResponse(res, "Unable to load support tickets. Please try again.");
}

export async function createSupportTicket(payload, getToken) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: await authHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, "Unable to create support ticket. Please try again.");
}

export async function replyToMySupportTicket(id, payload, getToken) {
  const res = await fetch(`${API_BASE}/my/${id}/reply`, {
    method: "POST",
    headers: await authHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, "Unable to send reply. Please try again.");
}
