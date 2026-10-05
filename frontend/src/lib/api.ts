/**
 * CAConnect — API client
 *
 * All backend communication lives here.
 * The frontend never sees Supabase keys or the Supabase URL.
 * Token is stored in localStorage for the learning project.
 * In production, tokens should be stored more securely.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

// Thrown when the backend returns 401 — App.tsx catches this to log the user out
export class AuthError extends Error {
  constructor() {
    super('Authentication expired');
    this.name = 'AuthError';
  }
}

// ─── Token helpers ───────────────────────────────────

const TOKEN_KEY = 'caconnect_token';
const REFRESH_TOKEN_KEY = 'caconnect_refresh_token'; // learning-project comment

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── Internal helpers ────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** Check if a URL path targets an /auth/ endpoint (no refresh attempted).
 *  Exception: /auth/change-password IS allowed to refresh (like data endpoints). */
function isAuthEndpoint(url: string): boolean {
  return /\/auth\/(?!change-password)/.test(url);
}

/**
 * Format a Pydantic 422 validation error into a readable string.
 * Strips technical prefixes like "Value error, " so users see only the message.
 */
function formatValidationError(body: Record<string, unknown>): string {
  const detail = body.detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    let msg: string;
    if (typeof first === 'string') {
      msg = first;
    } else if (first && typeof first === 'object' && 'msg' in first) {
      msg = String((first as Record<string, unknown>).msg);
    } else {
      msg = 'Validation error';
    }
    msg = msg.replace(/^Value error,?\s*/i, '');
    return msg;
  }
  if (typeof detail === 'string') return detail;
  return 'Validation error';
}

// ─── Single in-flight refresh ────────────────────────

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new AuthError();
  const resp = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!resp.ok) throw new AuthError();
  const data = await resp.json();
  setToken(data.access_token);
  if (data.refresh_token) setRefreshToken(data.refresh_token);
  return data.access_token;
}

async function handleResponse<T>(resp: Response, requestUrl?: string, requestInit?: RequestInit): Promise<T> {
  if (resp.status === 401) {
    if (requestUrl && isAuthEndpoint(requestUrl)) {
      throw new AuthError();
    }
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    }
    const newToken = await refreshPromise;
    const retryInit: RequestInit = { ...requestInit, headers: { ...requestInit?.headers, Authorization: `Bearer ${newToken}` } };
    const retryResp = await fetch(requestUrl!, retryInit);
    if (retryResp.status === 401) throw new AuthError();
    if (retryResp.status === 422) {
      const body = await retryResp.json().catch(() => ({}));
      throw new Error(formatValidationError(body));
    }
    if (!retryResp.ok) {
      const body = await retryResp.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed (${retryResp.status})`);
    }
    return retryResp.json() as Promise<T>;
  }
  if (resp.status === 422) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatValidationError(body));
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

// ─── Auth endpoints ──────────────────────────────────

export async function signup(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
  const resp = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(resp, `${API_URL}/auth/signup`);
}

export async function login(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
  const resp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(resp, `${API_URL}/auth/login`);
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch {
      // Best-effort: clear tokens locally even if call fails
    }
  }
  clearToken();
}

// ─── Profile endpoints ───────────────────────────────

export async function getProfile(): Promise<{
  name: string | null;
  branch: string | null;
  markets: string[];
  notificationPref: string;
  isComplete: boolean;
  email: string;
}> {
  const resp = await fetch(`${API_URL}/profile`, { headers: authHeaders() });
  return handleResponse(resp, `${API_URL}/profile`);
}

export async function updateProfile(profile: {
  name: string;
  branch: string;
  markets: string[];
  notificationPref: string;
}): Promise<void> {
  const resp = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(profile),
  });
  if (resp.status === 422) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatValidationError(body));
  }
  if (resp.status === 401) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    }
    const newToken = await refreshPromise;
    const retryResp = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: { ...authHeaders(), Authorization: `Bearer ${newToken}` },
      body: JSON.stringify(profile),
    });
    if (retryResp.status === 401) throw new AuthError();
    if (retryResp.status === 422) {
      const body = await retryResp.json().catch(() => ({}));
      throw new Error(formatValidationError(body));
    }
    if (!retryResp.ok) throw new Error('Failed to save profile');
    return;
  }
  if (!resp.ok) throw new Error('Failed to save profile');
}

// ─── Corporate Actions endpoints ─────────────────────

export async function getCorporateActions(): Promise<any[]> {
  const resp = await fetch(`${API_URL}/corporate-actions`, { headers: authHeaders() });
  return handleResponse(resp, `${API_URL}/corporate-actions`);
}

export async function getCorporateAction(id: string): Promise<any> {
  const resp = await fetch(`${API_URL}/corporate-actions/${id}`, { headers: authHeaders() });
  return handleResponse(resp, `${API_URL}/corporate-actions/${id}`);
}

// ─── Reviews endpoints ───────────────────────────────

export async function getReviews(): Promise<any[]> {
  const resp = await fetch(`${API_URL}/reviews`, { headers: authHeaders() });
  return handleResponse(resp, `${API_URL}/reviews`);
}

export async function submitReview(data: {
  eventId: string;
  affectedAccountCount: number;
  election: string;
  notes: string;
  contactedOps: boolean;
  opsReason?: string;
}): Promise<any> {
  const init: RequestInit = {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  };
  const resp = await fetch(`${API_URL}/reviews`, init);
  return handleResponse(resp, `${API_URL}/reviews`, init);
}

export async function deleteReview(reference: string): Promise<void> {
  const resp = await fetch(`${API_URL}/reviews/${reference}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (resp.status === 422) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatValidationError(body));
  }
  if (resp.status === 401) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    }
    const newToken = await refreshPromise;
    const retryResp = await fetch(`${API_URL}/reviews/${reference}`, {
      method: 'DELETE',
      headers: { ...authHeaders(), Authorization: `Bearer ${newToken}` },
    });
    if (retryResp.status === 401) throw new AuthError();
    if (!retryResp.ok) throw new Error('Failed to delete review');
    return;
  }
  if (!resp.ok) throw new Error('Failed to delete review');
}

// ─── Change password ─────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const init: RequestInit = {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  };
  const resp = await fetch(`${API_URL}/auth/change-password`, init);
  return handleResponse(resp, `${API_URL}/auth/change-password`, init);
}