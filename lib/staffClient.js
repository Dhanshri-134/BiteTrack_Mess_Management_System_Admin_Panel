import { API_BASE } from "./api";
import { offlineFetch } from "./offlineFetch";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function headers(hasBody = false) {
  const token = getToken();
  return {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function staffRequest(path, options = {}) {
  const { method = "POST", body } = options;
  const res = await fetch(`${API_BASE}${path}`, {
  // const res = await fetch(`${path}`, {
    method,
    headers: headers(body !== undefined),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function staffOfflineRequest(cacheKey, path, options = {}) {
  const { method = "GET", body } = options;
  const data = await offlineFetch(cacheKey, () =>
    staffRequest(path, { method, body })
  );
  return data;
}
