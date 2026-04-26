export const API_BASE = "https://apimusicadmin.cocspedsafliz.workers.dev";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const key = localStorage.getItem("mc_admin_key");
  const headers = new Headers(options?.headers);
  
  if (key) {
    headers.set("x-admin-key", key);
  }
  
  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // We let auth context handle clearing by throwing it
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let msg = "API Error";
    try {
      const errJson = await res.json();
      msg = errJson.message || errJson.error || msg;
    } catch {
      msg = res.statusText;
    }
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}
