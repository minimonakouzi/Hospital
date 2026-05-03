export async function adminAuthHeaders(getToken, headers = {}) {
  let token = "";

  if (typeof getToken === "function") {
    token = await getToken({ skipCache: true });
    if (token) {
      localStorage.setItem("clerk_token", token);
    }
  }

  if (!token) {
    token = localStorage.getItem("clerk_token") || "";
  }

  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}
