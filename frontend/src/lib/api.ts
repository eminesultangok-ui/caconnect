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

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Internal helpers ────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(resp: Response): Promise<T> {
  if (resp.status === 401) {
    throw new AuthError();
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    const msg = body.detail || `Request failed (${resp.status})`;
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

// ─── Auth endpoints ──────────────────────────────────

export async function signup(email: string, password: string): Promise<{ access_token: string }> {
  const resp = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(resp);
}

export async function login(email: string, password: string): Promise<{ access_token: string }> {
  const resp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(resp);
}

// ─── Profile endpoints ───────────────────────────────

export async function getProfile(): Promise<{
  name: string | null;
  branch: string | null;
  markets: string[];
  notificationPref: string;
  isComplete: boolean;
}> {
  const resp = await fetch(`${API_URL}/profile`, { headers: authHeaders() });
  return handleResponse(resp);
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
  if (resp.status === 401) throw new AuthError();
  if (!resp.ok) throw new Error('Failed to save profile');
}

// ─── Corporate Actions endpoints ─────────────────────

export async function getCorporateActions(): Promise<any[]> {
  const resp = await fetch(`${API_URL}/corporate-actions`, { headers: authHeaders() });
  return handleResponse(resp);
}

export async function getCorporateAction(id: string): Promise<any> {
  const resp = await fetch(`${API_URL}/corporate-actions/${id}`, { headers: authHeaders() });
  return handleResponse(resp);
}

// ─── Reviews endpoints ───────────────────────────────

export async function getReviews(): Promise<any[]> {
  const resp = await fetch(`${API_URL}/reviews`, { headers: authHeaders() });
  return handleResponse(resp);
}

export async function submitReview(data: {
  eventId: string;
  affectedAccountCount: number;
  election: string;
  notes: string;
  contactedOps: boolean;
  opsReason?: string;
}): Promise<any> {
  const resp = await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(resp);
}

export async function deleteReview(reference: string): Promise<void> {
  const resp = await fetch(`${API_URL}/reviews/${reference}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (resp.status === 401) throw new AuthError();
  if (!resp.ok) throw new Error('Failed to delete review');
}