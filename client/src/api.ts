const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";

let accessToken: string | null = sessionStorage.getItem("accessToken");

export const setAccessToken = (t: string | null) => {
  accessToken = t;
  if (t) sessionStorage.setItem("accessToken", t);
  else sessionStorage.removeItem("accessToken");
};

export const getAccessToken = () => accessToken;

type ApiError = { error?: { code?: string; message?: string } };

const parseJson = async <T>(res: Response): Promise<T> => {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // not json
    throw new Error(text || `HTTP ${res.status}`);
  }
};

const refresh = async (): Promise<boolean> => {
  const res = await fetch(`${API_PREFIX}/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) return false;
  const json = await parseJson<{ accessToken: string }>(res);
  setAccessToken(json.accessToken);
  return true;
};

export const apiFetch = async <T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> => {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  if (res.status === 401 && retry) {
    const ok = await refresh();
    if (ok) return apiFetch<T>(path, init, false);
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await parseJson<ApiError>(res);
      msg = j?.error?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return parseJson<T>(res);
};
