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
      !String(value).startsWith("All ")
    ) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseResponse(res) {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.message || `Performance request failed (${res.status})`);
  }

  return body;
}

export async function fetchPerformanceSummary(filters = {}, getToken) {
  const res = await fetch(
    `${API_BASE}/api/performance/summary${buildQuery(filters)}`,
    {
      headers: await adminAuthHeaders(getToken),
    },
  );

  return parseResponse(res);
}
