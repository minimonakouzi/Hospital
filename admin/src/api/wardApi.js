import { adminAuthHeaders } from "../utils/adminAuthHeaders";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "All"
    ) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseResponse(res, fallbackMessage) {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.message || fallbackMessage || `Ward request failed (${res.status})`);
  }

  return body;
}

async function wardHeaders(getToken, headers = {}) {
  return adminAuthHeaders(getToken, headers);
}

export async function fetchWards(filters = {}, getToken) {
  const res = await fetch(`${API_BASE}/api/wards${buildQuery(filters)}`, {
    headers: await wardHeaders(getToken),
  });

  return parseResponse(res, "Failed to load wards.");
}

export async function fetchWardStats(getToken) {
  const res = await fetch(`${API_BASE}/api/wards/stats/summary`, {
    headers: await wardHeaders(getToken),
  });

  return parseResponse(res, "Failed to load ward stats.");
}

export async function createWard(payload, getToken) {
  const res = await fetch(`${API_BASE}/api/wards`, {
    method: "POST",
    headers: await wardHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseResponse(res, "Failed to create ward.");
}

export async function updateWard(id, payload, getToken) {
  const res = await fetch(`${API_BASE}/api/wards/${id}`, {
    method: "PUT",
    headers: await wardHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseResponse(res, "Failed to update ward.");
}

export async function deleteWard(id, getToken) {
  const res = await fetch(`${API_BASE}/api/wards/${id}`, {
    method: "DELETE",
    headers: await wardHeaders(getToken),
  });

  return parseResponse(res, "Failed to delete ward.");
}

export async function createRoom(wardId, payload, getToken) {
  const res = await fetch(`${API_BASE}/api/wards/${wardId}/rooms`, {
    method: "POST",
    headers: await wardHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseResponse(res, "Failed to create room.");
}

export async function updateRoom(wardId, roomId, payload, getToken) {
  const res = await fetch(`${API_BASE}/api/wards/${wardId}/rooms/${roomId}`, {
    method: "PUT",
    headers: await wardHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseResponse(res, "Failed to update room.");
}

export async function deleteRoom(wardId, roomId, getToken) {
  const res = await fetch(`${API_BASE}/api/wards/${wardId}/rooms/${roomId}`, {
    method: "DELETE",
    headers: await wardHeaders(getToken),
  });

  return parseResponse(res, "Failed to delete room.");
}

export async function createBed(wardId, roomId, payload, getToken) {
  const res = await fetch(`${API_BASE}/api/wards/${wardId}/rooms/${roomId}/beds`, {
    method: "POST",
    headers: await wardHeaders(getToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseResponse(res, "Failed to create bed.");
}

export async function updateBed(wardId, roomId, bedId, payload, getToken) {
  const res = await fetch(
    `${API_BASE}/api/wards/${wardId}/rooms/${roomId}/beds/${bedId}`,
    {
      method: "PUT",
      headers: await wardHeaders(getToken, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );

  return parseResponse(res, "Failed to update bed.");
}

export async function deleteBed(wardId, roomId, bedId, getToken) {
  const res = await fetch(
    `${API_BASE}/api/wards/${wardId}/rooms/${roomId}/beds/${bedId}`,
    {
      method: "DELETE",
      headers: await wardHeaders(getToken),
    },
  );

  return parseResponse(res, "Failed to delete bed.");
}
