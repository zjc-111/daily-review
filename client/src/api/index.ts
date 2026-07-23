// API client — replaces 妙搭's axiosForBackend with plain fetch
import type {
  DailyEntryResponse,
  ReviewResultResponse,
  PeriodReviewResponse,
  RecentEntriesResponse,
  UserProfileResponse,
  LoginResponse,
  ParseIcsResponse,
} from "@shared/api.interface";

const AUTH_TOKEN_KEY = "dr_auth_token";

// ================================================================
// Base config
// ================================================================
// In dev, Vite proxies /api to the backend. In production, the backend
// serves the same origin so /api works directly.
// VITE_API_URL defaults to "/api" for dev proxy / same-origin prod.
// For mobile (Capacitor with remote backend), build with:
//   VITE_API_URL=http://YOUR_PC_IP:3000/api npm run cap:sync
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ================================================================
// Auth token management
// ================================================================
function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ================================================================
// Fetch wrapper
// ================================================================
interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
}

async function request<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = "GET", body, params, headers = {} } = options;

  // Append query string
  let fullUrl = API_BASE + url;
  if (params) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) search.set(k, String(v));
    }
    const qs = search.toString();
    if (qs) fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
  }

  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: ApiEnvelope<T>;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    throw new Error("Invalid JSON response");
  }

  if (!res.ok || !json.success) {
    const err: any = new Error(json.error || `HTTP ${res.status}`);
    err.response = { data: json };
    err.status = res.status;
    throw err;
  }

  return json.data as T;
}

// ================================================================
// Daily Entries
// ================================================================
export async function getRecentEntries(limit = 10): Promise<RecentEntriesResponse> {
  return request<RecentEntriesResponse>("/reviews/recent", { params: { limit } });
}

export async function getEntry(date: string): Promise<DailyEntryResponse | null> {
  return request<DailyEntryResponse | null>("/reviews/entry", { params: { date } });
}

export async function getEntriesInRange(
  startDate: string,
  endDate: string
): Promise<DailyEntryResponse[]> {
  return request<DailyEntryResponse[]>("/reviews/entries", {
    params: { startDate, endDate },
  });
}

export async function saveEntry(
  date: string,
  content: string,
  mood?: number | null,
  energy?: number | null
): Promise<DailyEntryResponse> {
  return request<DailyEntryResponse>("/reviews/entry", {
    method: "POST",
    body: { date, content, mood, energy },
  });
}

// ================================================================
// Delete
// ================================================================
export async function deleteEntry(date: string): Promise<void> {
  await request<void>("/reviews/entry", { method: "DELETE", params: { date } });
}

export async function deleteAiReview(date: string): Promise<void> {
  await request<void>("/reviews/ai-review", { method: "DELETE", params: { date } });
}

// ================================================================
// AI Review Generation
// ================================================================
export async function generateDailyReview(
  date: string,
  importedMaterials?: string,
  mood?: number | null,
  energy?: number | null
): Promise<ReviewResultResponse> {
  return request<ReviewResultResponse>("/reviews/generate", {
    method: "POST",
    body: { date, importedMaterials, mood, energy },
  });
}

export async function generateAiReview(
  content: string,
  importedMaterials?: string,
  date?: string
): Promise<ReviewResultResponse> {
  return request<ReviewResultResponse>("/ai/review", {
    method: "POST",
    body: { content, importedMaterials, date },
  });
}

export async function saveAiReviewMeta(params: {
  dailyEntryId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}): Promise<void> {
  await request<void>("/ai/review/save-meta", { method: "POST", body: params });
}

export async function generatePeriodReview(
  type: "weekly" | "monthly" | "yearly",
  date: string
): Promise<PeriodReviewResponse> {
  return request<PeriodReviewResponse>("/reviews/generate-period", {
    method: "POST",
    body: { type, date },
  });
}

export async function getPeriodReview(
  type: "weekly" | "monthly" | "yearly",
  date: string
): Promise<PeriodReviewResponse | null> {
  return request<PeriodReviewResponse | null>("/reviews/period", {
    params: { type, date },
  });
}

// ================================================================
// Phone Auth
// ================================================================
export async function sendVerificationCode(
  phone: string,
): Promise<{ message: string; debug?: { code: string } }> {
  return request<{ message: string; debug?: { code: string } }>(
    "/auth/send-code",
    { method: "POST", body: { phone } },
  );
}

export async function verifyCode(phone: string, code: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>("/auth/verify", {
    method: "POST",
    body: { phone, code },
  });
  setAuthToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<UserProfileResponse> {
  return request<UserProfileResponse>("/auth/me");
}

export async function logout(): Promise<void> {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearAuthToken();
  }
}

// ================================================================
// Calendar Import
// ================================================================
export async function parseIcsFile(icsContent: string): Promise<ParseIcsResponse> {
  return request<ParseIcsResponse>("/calendar/parse-ics", {
    method: "POST",
    body: { icsContent },
  });
}

// ================================================================
// Aliases for phone-login component
// ================================================================
export const sendSmsCode = sendVerificationCode;
export const verifyLogin = verifyCode;

// ================================================================
// Auth Token Management (exported for useAuth hook)
// ================================================================
export { getAuthToken, clearAuthToken as removeAuthToken };
