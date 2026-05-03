import { adminAuthHeaders } from "../utils/adminAuthHeaders";
import { staffAuthHeaders } from "../utils/staffAuthHeaders";

const API_ROOT = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api/radiology-reports`;

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

export async function fetchStaffRadiologyReports(filters = {}) {
  const res = await fetch(`${API_BASE}/staff${query(filters)}`, { headers: staffAuthHeaders() });
  return parse(res, "Unable to load radiology reports.");
}

export async function createStaffRadiologyReport(payload) {
  const res = await fetch(`${API_BASE}/staff`, {
    method: "POST",
    headers: staffAuthHeaders(jsonHeaders(payload, {})),
    body: requestBody(payload),
  });
  return parse(res, "Unable to create radiology report.");
}

export async function updateStaffRadiologyReport(id, payload) {
  const res = await fetch(`${API_BASE}/staff/${id}`, {
    method: "PUT",
    headers: staffAuthHeaders(jsonHeaders(payload, {})),
    body: requestBody(payload),
  });
  return parse(res, "Unable to update radiology report.");
}

export async function deleteStaffRadiologyReport(id) {
  const res = await fetch(`${API_BASE}/staff/${id}`, { method: "DELETE", headers: staffAuthHeaders() });
  return parse(res, "Unable to delete radiology report.");
}

export async function fetchAdminRadiologyReports(filters = {}, getToken) {
  const res = await fetch(`${API_BASE}${query(filters)}`, { headers: await adminAuthHeaders(getToken) });
  return parse(res, "Unable to load radiology reports.");
}

export async function createAdminRadiologyReport(payload, getToken) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: await adminAuthHeaders(getToken, jsonHeaders(payload, {})),
    body: requestBody(payload),
  });
  return parse(res, "Unable to create radiology report.");
}

export async function deleteAdminRadiologyReport(id, getToken) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE", headers: await adminAuthHeaders(getToken) });
  return parse(res, "Unable to delete radiology report.");
}
