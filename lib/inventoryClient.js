import { API_BASE } from "./api";
import { offlineFetch } from "./offlineFetch";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function buildHeaders(extraHeaders = {}, hasBody = false) {
  const token = getToken();

  return {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export async function inventoryRequest(path, options = {}) {
  const { method = "POST", body, headers } = options;
  const res = await fetch(`${API_BASE}${path}`, {
  // const res = await fetch(`${path}`, {
    method,
    headers: buildHeaders(headers, body !== undefined),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

export async function inventoryOfflineRequest(cacheKey, path, options = {}) {
  const data = await offlineFetch(cacheKey, () => inventoryRequest(path, options));
  return data || { success: false, data: [] };
}
