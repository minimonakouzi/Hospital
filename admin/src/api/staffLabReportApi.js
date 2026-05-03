import { adminAuthHeaders } from "../utils/adminAuthHeaders";
import { staffAuthHeaders } from "../utils/staffAuthHeaders";

const API_ROOT = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api/lab-reports`;

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

function isFormData(payload) {
  return typeof FormData !== "undefined" && payload instanceof FormData;
}

function jsonHeaders(payload, headers) {
  return isFormData(payload) ? headers : { ...headers, "Content-Type": "application/json" };
}

function requestBody(payload) {
  return isFormData(payload) ? payload : JSON.stringify(payload);
}

export async function fetchStaffLabReports(filters = {}) {
  const res = await fetch(`${API_BASE}/staff${query(filters)}`, { headers: staffAuthHeaders() });
  return parse(res, "Unable to load lab reports.");
}

export async function createStaffLabReport(payload) {
  const res = await fetch(`${API_BASE}/staff`, {
    method: "POST",
    headers: staffAuthHeaders(jsonHeaders(payload, {})),
    body: requestBody(payload),
  });
  return parse(res, "Unable to create lab report.");
}

export async function updateStaffLabResult(id, payload) {
  const res = await fetch(`${API_BASE}/staff/${id}/result`, {
    method: "PUT",
    headers: staffAuthHeaders(jsonHeaders(payload, {})),
    body: requestBody(payload),
  });
  return parse(res, "Unable to update lab result.");
}

export async function updateStaffLabStatus(id, status) {
  const res = await fetch(`${API_BASE}/staff/${id}/status`, {
    method: "PUT",
    headers: staffAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  return parse(res, "Unable to update lab status.");
}

export async function deleteStaffLabReport(id) {
  const res = await fetch(`${API_BASE}/staff/${id}`, { method: "DELETE", headers: staffAuthHeaders() });
  return parse(res, "Unable to delete lab report.");
}

export async function fetchAdminLabReports(filters = {}, getToken) {
  const res = await fetch(`${API_BASE}${query(filters)}`, { headers: await adminAuthHeaders(getToken) });
  return parse(res, "Unable to load lab reports.");
}

export async function createAdminLabReport(payload, getToken) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: await adminAuthHeaders(getToken, jsonHeaders(payload, {})),
    body: requestBody(payload),
  });
  return parse(res, "Unable to create lab report.");
}

export async function updateAdminLabReport(id, payload, getToken) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: await adminAuthHeaders(getToken, jsonHeaders(payload, {})),
    body: requestBody(payload),
  });
  return parse(res, "Unable to update lab report.");
}

export async function deleteAdminLabReport(id, getToken) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE", headers: await adminAuthHeaders(getToken) });
  return parse(res, "Unable to delete lab report.");
}
