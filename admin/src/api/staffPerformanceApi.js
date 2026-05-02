const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseResponse(res) {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      body?.message || `Staff performance request failed (${res.status})`,
    );
  }

  return body;
}

export async function fetchStaffPerformanceRecords(filters = {}) {
  const res = await fetch(
    `${API_BASE}/api/staff-performance${buildQuery(filters)}`,
  );
  const body = await parseResponse(res);
  return Array.isArray(body?.data) ? body.data : [];
}

export async function fetchStaffPerformanceSummary(filters = {}) {
  const res = await fetch(
    `${API_BASE}/api/staff-performance/summary${buildQuery(filters)}`,
  );
  const body = await parseResponse(res);
  return body?.data || null;
}
