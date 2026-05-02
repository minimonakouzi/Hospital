import { staffAuthHeaders } from "../utils/staffAuthHeaders";

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

export async function fetchSupportTickets(filters = {}) {
  const res = await fetch(`${API_BASE}${buildQuery(filters)}`, {
    headers: staffAuthHeaders(),
  });
  return parseResponse(res, "Unable to load support tickets.");
}

export async function replyToSupportTicket(id, payload) {
  const res = await fetch(`${API_BASE}/${id}/reply`, {
    method: "POST",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, "Unable to send reply.");
}

export async function updateSupportTicketStatus(id, status) {
  const res = await fetch(`${API_BASE}/${id}/status`, {
    method: "PUT",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  return parseResponse(res, "Unable to update ticket status.");
}

export async function updateSupportTicketPriority(id, priority) {
  const res = await fetch(`${API_BASE}/${id}/priority`, {
    method: "PUT",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ priority }),
  });
  return parseResponse(res, "Unable to update ticket priority.");
}

export async function assignSupportTicket(id, assignedStaffId = "") {
  const res = await fetch(`${API_BASE}/${id}/assign`, {
    method: "PUT",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(assignedStaffId ? { assignedStaffId } : {}),
  });
  return parseResponse(res, "Unable to assign ticket.");
}
