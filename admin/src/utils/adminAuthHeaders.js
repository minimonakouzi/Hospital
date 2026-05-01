export async function adminAuthHeaders(getToken, headers = {}) {
  let token = localStorage.getItem("clerk_token");

  if (!token && typeof getToken === "function") {
    token = await getToken();
    if (token) localStorage.setItem("clerk_token", token);
  }

  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}
