import { ApiError, apiRequest } from "./api-client";

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  status?: string;
  subscriptions?: unknown[];
};

type SessionResponse = {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
};

const ACCESS_TOKEN_KEY = "mkwanjabet_access_token";
const REFRESH_TOKEN_KEY = "mkwanjabet_refresh_token";
const USER_KEY = "mkwanjabet_user";
let refreshRequest: Promise<SessionResponse> | null = null;

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function saveSession(session: SessionResponse) {
  const store = storage();
  if (!store) return;
  store.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  store.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  store.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  const store = storage();
  if (!store) return;
  store.removeItem(ACCESS_TOKEN_KEY);
  store.removeItem(REFRESH_TOKEN_KEY);
  store.removeItem(USER_KEY);
}

async function refreshSession() {
  const refreshToken = storage()?.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh token");
  if (!refreshRequest) {
    refreshRequest = apiRequest<SessionResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).then((session) => {
      saveSession(session);
      return session;
    }).finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}

export async function authenticatedApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = storage()?.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) throw new ApiError(401, { message: "No active session" });

  const request = (token: string) => apiRequest<T>(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  try {
    return await request(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    try {
      const session = await refreshSession();
      return await request(session.accessToken);
    } catch (refreshError) {
      clearSession();
      throw refreshError;
    }
  }
}

export function getCurrentUser() {
  return authenticatedApiRequest<SessionUser>("/auth/me").then((user) => {
    const store = storage();
    if (store) store.setItem(USER_KEY, JSON.stringify(user));
    return user;
  });
}

export async function logoutSession() {
  const refreshToken = storage()?.getItem(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearSession();
  }
}
