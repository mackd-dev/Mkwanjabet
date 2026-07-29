const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api/v1";

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`MkwanjaBet API request failed with status ${status}`);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: init.cache ?? "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload as T;
}
