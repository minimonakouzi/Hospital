export function staffAuthHeaders(headers = {}) {
  const token = localStorage.getItem("staffToken_v1");
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}
