import type { AuthResult, ProfilePreferences, UserProfile } from "../auth/types";
import type { Transaction } from "../data/finance";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  if (!apiBaseUrl) throw new ApiError(0, "EXPO_PUBLIC_API_URL is not configured.");

  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Unable to reach the Student Finance API.");
  }

  let payload: { data?: T; error?: { message?: string } };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, "The API returned an invalid response.");
  }

  if (!response.ok || payload.data === undefined) {
    throw new ApiError(response.status, payload.error?.message ?? "The request could not be completed.");
  }
  return payload.data;
}

export const api = {
  register(email: string, password: string, displayName: string) {
    return request<AuthResult>("/api/v1/auth/register", {
      method: "POST",
      body: { email, password, displayName },
    });
  },
  login(email: string, password: string) {
    return request<AuthResult>("/api/v1/auth/login", { method: "POST", body: { email, password } });
  },
  currentSession(token: string) {
    return request<{ user: UserProfile; session: { expiresAt: string } }>("/api/v1/auth/session", { token });
  },
  logout(token: string) {
    return request<{ loggedOut: boolean }>("/api/v1/auth/logout", { method: "POST", token });
  },
  profile(token: string) {
    return request<{ user: UserProfile }>("/api/v1/me/profile", { token });
  },
  updateProfile(token: string, profile: ProfilePreferences) {
    return request<{ user: UserProfile }>("/api/v1/me/profile", { method: "PATCH", body: profile, token });
  },
  transactions(token: string) {
    return request<{ transactions: Transaction[] }>("/api/v1/me/transactions", { token });
  },
  saveTransaction(token: string, transaction: Transaction) {
    return request<{ transaction: Transaction }>(`/api/v1/me/transactions/${encodeURIComponent(transaction.id)}`, {
      method: "PUT",
      body: transaction,
      token,
    });
  },
  deleteTransaction(token: string, id: string) {
    return request<{ deleted: boolean }>(`/api/v1/me/transactions/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token,
    });
  },
  requestPasswordReset(email: string) {
    return request<{ message: string }>("/api/v1/auth/password-reset/request", { method: "POST", body: { email } });
  },
  confirmPasswordReset(token: string, newPassword: string) {
    return request<{ passwordChanged: boolean }>("/api/v1/auth/password-reset/confirm", {
      method: "POST",
      body: { token, newPassword },
    });
  },
};