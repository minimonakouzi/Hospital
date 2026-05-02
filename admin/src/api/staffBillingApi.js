import { adminAuthHeaders } from "../utils/adminAuthHeaders";
import { staffAuthHeaders } from "../utils/staffAuthHeaders";

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

export async function fetchStaffBills(filters = {}) {
  const res = await fetch(`${API_BASE}/staff${query(filters)}`, {
    headers: staffAuthHeaders(),
  });
  return parse(res, "Unable to load bills.");
}

export async function createStaffBill(payload) {
  const res = await fetch(`${API_BASE}/staff`, {
    method: "POST",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to create bill.");
}

export async function updateStaffBill(id, payload) {
  const res = await fetch(`${API_BASE}/staff/${id}`, {
    method: "PUT",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to update bill.");
}

export async function updateStaffBillPayment(id, payload) {
  const res = await fetch(`${API_BASE}/staff/${id}/payment`, {
    method: "PUT",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to update payment.");
}

export async function updateStaffBillInsurance(id, payload) {
  const res = await fetch(`${API_BASE}/staff/${id}/insurance`, {
    method: "PUT",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to update insurance.");
}

export async function deleteStaffBill(id) {
  const res = await fetch(`${API_BASE}/staff/${id}`, {
    method: "DELETE",
    headers: staffAuthHeaders(),
  });
  return parse(res, "Unable to delete bill.");
}

export async function fetchAdminBills(filters = {}, getToken) {
  const res = await fetch(`${API_BASE}${query(filters)}`, {
    headers: await adminAuthHeaders(getToken),
  });
  return parse(res, "Unable to load bills.");
}

export async function createAdminBill(payload, getToken) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: await adminAuthHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to create bill.");
}

export async function updateAdminBill(id, payload, getToken) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: await adminAuthHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to update bill.");
}

export async function updateAdminBillPayment(id, payload, getToken) {
  const res = await fetch(`${API_BASE}/${id}/payment`, {
    method: "PUT",
    headers: await adminAuthHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to update payment.");
}

export async function updateAdminBillInsurance(id, payload, getToken) {
  const res = await fetch(`${API_BASE}/${id}/insurance`, {
    method: "PUT",
    headers: await adminAuthHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parse(res, "Unable to update insurance.");
}

export async function deleteAdminBill(id, getToken) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: await adminAuthHeaders(getToken),
  });
  return parse(res, "Unable to delete bill.");
}
