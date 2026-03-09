import { apiFetch } from "./client";

export type User = {
  id: string;
  email: string | null;
  username: string | null;
  name: string;
  isAdmin: number;
  isVerified: number;
  needsUsername?: boolean;
  needsOnboarding?: boolean;
};

export type Theme = "light" | "dark" | "system";
export type Accent = "sky" | "violet" | "rose" | "amber" | "emerald";
export type Vibe = "minimal" | "playful" | "bold";
export type Persona = "soft_cute" | "bold_dark" | "clean_minimal" | "energetic_fun";
export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export type UserPreferences = {
  userId: string;
  theme: Theme;
  accent: Accent;
  vibe: Vibe;
  persona: Persona;
  onboardingDone: boolean;
  funCardEnabled: boolean;
  updatedAt?: number | string | null;
};

export type AuthProvider = {
  provider: string;
  linkedAt: number;
  providerEmail?: string;
};

export type UsernameCheckResponse = {
  available: boolean;
  valid: boolean;
  normalizedUsername: string | null;
  error: string | null;
};

export type LoginResponse = {
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: {
      id: string;
      email: string | null;
    };
  };
  user: {
    id: string;
    email: string | null;
  };
};

export type TelegramAuthResponse =
  | {
      linked: true;
      provider: "telegram";
      userId: string;
    }
  | {
      accessToken: string;
      tokenType: "Bearer";
      expiresIn: number;
    };
export type Profile = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  gender: Gender | null;
  birthYear: number | null;
  interests: string[];
  grade: number | null;
  country: string;
  targetMajor: string | null;
  satMath: number | null;
  satReadingWriting: number | null;
  satTotal: number | null;
  ieltsScore: number | null;
  updatedAt?: number | string | null;
};

export type OnboardingPayload = {
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_year: number;
  interests: string[];
  persona: Persona;
  theme: Theme;
  accent?: Accent;
};

export type OnboardingProfile = OnboardingPayload & {
  onboarding_done: boolean;
};

export type TelegramConfig = {
  enabled: boolean;
  botUsername: string | null;
  botUrl?: string;
  requiredDomain?: string | null;
  currentHost?: string | null;
  domainMatch?: boolean;
  error: string | null;
};

export type University = {
  id: string;
  name: string;
  state: string;
  tuitionUsd: number | null;
  aidPolicy: string | null;
  satRangeMin: number | null;
  satRangeMax: number | null;
  englishReq: string | null;
  applicationDeadline: string | null;
  description: string | null;
};

export type UniversityFact = {
  id: string;
  universityId: string;
  factText: string;
  sourceUrl: string;
  tag: string | null;
  year: number | null;
  createdAt: number;
  isVerified: number;
};

export async function register(payload: {
  email: string;
  password: string;
  name?: string;
}) {
  return apiFetch<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { identifier: string; password: string }) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function telegramAuth(data: Record<string, unknown>) {
  return apiFetch<TelegramAuthResponse>(
    "/api/auth/telegram",
    { method: "POST", body: JSON.stringify(data) },
  );
}

export async function getTelegramConfig() {
  return apiFetch<TelegramConfig>("/api/auth/telegram/config", {}, { silent: true });
}

export async function googleAuth(credential: string) {
  return apiFetch<User & { isNewUser?: boolean; needsUsername?: boolean }>(
    "/api/auth/google",
    { method: "POST", body: JSON.stringify({ credential }) },
  );
}

export async function phoneSendOtp(phone: string) {
  return apiFetch<{ sent: boolean; message: string; code?: string }>(
    "/api/auth/phone/send-otp",
    { method: "POST", body: JSON.stringify({ phone }) },
  );
}

export async function phoneVerifyOtp(phone: string, code: string) {
  return apiFetch<User & { isNewUser?: boolean; needsUsername?: boolean }>(
    "/api/auth/phone/verify-otp",
    { method: "POST", body: JSON.stringify({ phone, code }) },
  );
}

export async function forgotPassword(email: string) {
  return apiFetch<{ message: string; token?: string }>(
    "/api/auth/forgot-password",
    { method: "POST", body: JSON.stringify({ email }) },
  );
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function checkUsername(username: string) {
  return apiFetch<UsernameCheckResponse>(
    `/api/auth/check-username?username=${encodeURIComponent(username)}`,
    {},
    { silent: true },
  );
}

export async function setUsername(username: string, password?: string) {
  return apiFetch<User>("/api/auth/set-username", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function setPassword(password: string) {
  return apiFetch<{ updated: boolean }>("/api/auth/set-password", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  return apiFetch<{ loggedOut: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function me() {
  return apiFetch<{
    user: User;
    profile: Profile | null;
    providers?: AuthProvider[];
    preferences?: UserPreferences;
  }>("/api/auth/me", {}, { silent: true });
}

export async function updatePreferences(payload: Partial<UserPreferences>) {
  return apiFetch<UserPreferences>("/api/auth/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getOnboardingProfile() {
  return apiFetch<OnboardingProfile>("/api/profile/onboarding");
}

export async function saveOnboardingProfile(payload: OnboardingPayload) {
  return apiFetch<{ profile: Profile | null; preferences: UserPreferences | null }>(
    "/api/profile/onboarding",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function updatePersonalization(payload: {
  interests?: string[];
  persona?: Persona;
  theme?: Theme;
  accent?: Accent;
  vibe?: Vibe;
  fun_card_enabled?: boolean;
}) {
  return apiFetch<{ profile: Profile | null; preferences: UserPreferences | null }>(
    "/api/profile/personalization",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

// ── Account Linking ──────────────────────────────────────────────────────────
export async function getProviders() {
  return apiFetch<AuthProvider[]>("/api/account/providers");
}

export async function linkTelegram(data: Record<string, unknown>) {
  return apiFetch<{ linked: boolean }>("/api/account/link/telegram", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function linkGoogle(credential: string) {
  return apiFetch<{ linked: boolean }>("/api/account/link/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function unlinkProvider(provider: string) {
  return apiFetch<{ unlinked: boolean }>(`/api/account/providers/${provider}`, {
    method: "DELETE",
  });
}

export async function getProfile() {
  return apiFetch<Profile>("/api/profile");
}

export async function updateProfile(payload: {
  grade?: number | null;
  country?: string | null;
  target_major?: string | null;
  sat_math?: number | null;
  sat_reading_writing?: number | null;
  ielts_score?: number | null;
}) {
  return apiFetch<Profile>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function listUniversities(params: {
  search?: string;
  state?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.state) searchParams.set("state", params.state);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiFetch<University[]>(`/api/universities${query ? `?${query}` : ""}`);
}

export async function getUniversity(id: string) {
  return apiFetch<University & { facts: UniversityFact[] }>(
    `/api/universities/${id}`,
  );
}

export async function addFact(
  id: string,
  payload: {
    fact_text: string;
    source_url: string;
    tag?: string;
    year?: number;
  },
) {
  return apiFetch<UniversityFact>(`/api/universities/${id}/facts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function admissionsRecommend() {
  return apiFetch<{
    safety: University[];
    target: University[];
    reach: University[];
    disclaimer: string;
    message?: string;
  }>("/api/admissions/recommend", { method: "POST", body: JSON.stringify({}) });
}

export async function aiTutor(payload: {
  message: string;
  context?: "SAT" | "Admissions";
  university_id?: string;
}) {
  return apiFetch<{ reply: string; mode: string; disclaimer: string }>(
    "/api/ai/tutor",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getSatTopics() {
  return apiFetch<{ id: string; name: string; description: string | null }[]>(
    "/api/sat/topics",
  );
}

// ── Admin Auth ────────────────────────────────────────────────────────────────

export async function adminLogin(payload: {
  username: string;
  password: string;
}) {
  return apiFetch<{ admin: boolean }>("/api/auth/admin-login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminLogout() {
  return apiFetch<{ loggedOut: boolean }>("/api/auth/admin-logout", {
    method: "POST",
  });
}

export async function adminMe() {
  return apiFetch<{ admin: boolean }>(
    "/api/auth/admin-me",
    {},
    { silent: true },
  );
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export type AdminStats = {
  users: number;
  universities: number;
  activeSessions: number;
  recentActivity?: number;
  recentErrors?: number;
  dbHealthy?: boolean;
  supabase?: {
    hasUrl: boolean;
    hasAnonKey: boolean;
    hasServiceRoleKey: boolean;
  };
};
export type AdminUser = {
  id: string;
  email: string | null;
  name: string;
  isAdmin: number;
  createdAt: number;
  lastSignInAt?: number | null;
  providers?: string[];
};
export type AdminUniversity = {
  id: string;
  name: string;
  state: string;
  tuitionUsd: number | null;
  aidPolicy: string | null;
  satRangeMin: number | null;
  satRangeMax: number | null;
  englishReq: string | null;
  applicationDeadline: string | null;
  description: string | null;
};

export type AdminAuditLog = {
  id: string;
  userId: string | null;
  action: string;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: number;
  level: "info" | "warn" | "error";
};

export type AdminEvent = {
  id: string;
  type: string;
  level: "info" | "warn" | "error";
  createdAt: number;
  userId: string | null;
  details: unknown;
};

export type AdminErrorItem = {
  id: string;
  code: string;
  message: string;
  createdAt: number;
  details: unknown;
  fixHint: string;
};

export type AdminAiInsight = {
  generatedAt: number;
  mode: string;
  summary: string;
};

export async function adminGetStats() {
  return apiFetch<AdminStats>("/api/admin/stats");
}

export async function adminGetUsers(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  const data = await apiFetch<AdminUser[] | { users?: AdminUser[] }>(
    `/api/admin/users${qs ? `?${qs}` : ""}`,
  );

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object" && Array.isArray(data.users)) {
    return data.users;
  }

  return [];
}

export async function adminDeleteUser(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/admin/users/${id}`, {
    method: "DELETE",
  });
}

export async function adminToggleAdmin(id: string) {
  return apiFetch<{ id: string; isAdmin: number }>(
    `/api/admin/users/${id}/toggle-admin`,
    { method: "PATCH" },
  );
}

export async function adminGetUniversities() {
  return apiFetch<AdminUniversity[]>("/api/admin/universities");
}

export async function adminAddUniversity(payload: {
  name: string;
  state: string;
  tuitionUsd?: number;
  aidPolicy?: string;
  satRangeMin?: number;
  satRangeMax?: number;
  englishReq?: string;
  applicationDeadline?: string;
  description?: string;
}) {
  return apiFetch<AdminUniversity>("/api/admin/universities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteUniversity(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/admin/universities/${id}`, {
    method: "DELETE",
  });
}

export async function adminGetAuditLogs(limit = 200) {
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  return apiFetch<AdminAuditLog[]>(`/api/admin/audit-logs?${qs}`);
}

export async function adminGetEvents(limit = 200) {
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  return apiFetch<AdminEvent[]>(`/api/admin/events?${qs}`);
}

export async function adminGetErrors(limit = 200) {
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  return apiFetch<AdminErrorItem[]>(`/api/admin/errors?${qs}`);
}

export async function adminGetAiInsights() {
  return apiFetch<AdminAiInsight>("/api/admin/ai-insights");
}
