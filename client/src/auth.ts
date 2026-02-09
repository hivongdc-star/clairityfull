import { apiFetch, setAccessToken } from "./api";

export type User = { id: string; email: string };

export const register = async (email: string, password: string) => {
  await apiFetch<{ ok: boolean }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
};

export const login = async (email: string, password: string): Promise<User> => {
  const res = await apiFetch<{ accessToken: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setAccessToken(res.accessToken);
  return res.user;
};

export const logout = async () => {
  try {
    await apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
};

export const me = async (): Promise<User> => {
  const res = await apiFetch<{ user: User }>("/auth/me", { method: "GET" });
  return res.user;
};

export type Settings = { uiLocale: "en" | "vi" | "ja"; defaultMode: "auto" | "casual" | "friendly" | "business" };

export const getSettings = async (): Promise<Settings> => {
  return apiFetch<Settings>("/settings", { method: "GET" });
};

export const updateSettings = async (patch: Partial<Settings>) => {
  await apiFetch<{ ok: boolean }>("/settings", {
    method: "PUT",
    body: JSON.stringify(patch)
  });
};
