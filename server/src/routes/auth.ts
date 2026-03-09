import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import jwt from "jsonwebtoken";

import { getDb, getDbConfigStatus, isDatabaseHealthy } from "../db";
import { linkedIdentities, studentProfiles, userPreferences } from "../db/schema";
import { validateTelegramAuth, getTelegramDisplayName, type TelegramAuthData } from "../services/telegramAuth";
import { getSupabaseAdmin, getSupabaseAnon, getSupabaseConfigStatus } from "../utils/supabase";
import { AppError } from "../utils/error";
import { authLimiter, authReadLimiter } from "../middleware/rateLimit";
import { parseWithSchema } from "../utils/validation";
import {
  registerSchema,
  loginSchema,
  telegramAuthSchema,
  usernameSchema,
  normalizeUsername,
  validateNormalizedUsername,
} from "../validators/auth";
import { accentSchema, personaSchema, themeSchema, vibeSchema } from "../validators/profile";
import { z } from "zod";

const router = Router();

const TELEGRAM_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const REGISTER_INFLIGHT_TTL_MS = 20_000;
const LOGIN_INFLIGHT_TTL_MS = 15_000;
const TELEGRAM_CONFIG_CACHE_MS = 10 * 60 * 1000;
const registerInFlight = new Map<string, number>();
const loginInFlight = new Map<string, number>();
let telegramBotConfigCache: { username: string | null; fetchedAt: number } | null = null;

const preferencesUpdateSchema = z
  .object({
    theme: themeSchema.optional(),
    accent: accentSchema.optional(),
    vibe: vibeSchema.optional(),
    persona: personaSchema.optional(),
    onboardingDone: z.boolean().optional(),
    funCardEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const setPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

type ThemeMode = z.infer<typeof themeSchema>;
type Accent = z.infer<typeof accentSchema>;
type Vibe = z.infer<typeof vibeSchema>;
type Persona = z.infer<typeof personaSchema>;

type PreferencesShape = {
  userId: string;
  theme: ThemeMode;
  accent: Accent;
  vibe: Vibe;
  persona: Persona;
  onboardingDone: boolean;
  funCardEnabled: boolean;
  updatedAt?: Date | null;
};

const DEFAULT_PREFERENCES: Omit<PreferencesShape, "userId"> = {
  theme: "system",
  accent: "sky",
  vibe: "minimal",
  persona: "clean_minimal",
  onboardingDone: false,
  funCardEnabled: true,
  updatedAt: null,
};

function formatErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "NonError",
    message: String(error),
  };
}

function logAuthDebug(
  scope: string,
  requestId: string,
  message: string,
  details?: Record<string, unknown>,
  level: "info" | "error" = "info",
) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  if (level === "error") {
    console.error(`[auth:${scope}][${requestId}] ${message}${payload}`);
    return;
  }
  console.log(`[auth:${scope}][${requestId}] ${message}${payload}`);
}

function mapPersonaToVibe(persona: Persona): Vibe {
  if (persona === "bold_dark") {
    return "bold";
  }
  if (persona === "soft_cute" || persona === "energetic_fun") {
    return "playful";
  }
  return "minimal";
}

function parseInterests(raw: unknown): string[] {
  if (!raw || typeof raw !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function profileHasCompletedOnboarding(profile: any | null): boolean {
  if (!profile) {
    return false;
  }

  const interests = parseInterests(profile.interestsJson);
  return Boolean(
    profile.firstName &&
      profile.lastName &&
      profile.gender &&
      profile.birthYear &&
      interests.length > 0,
  );
}

function normalizePreferencesRow(userId: string, row?: any): PreferencesShape {
  const theme = themeSchema.safeParse(row?.theme).success ? (row.theme as ThemeMode) : DEFAULT_PREFERENCES.theme;
  const accent = accentSchema.safeParse(row?.accent).success
    ? (row.accent as Accent)
    : DEFAULT_PREFERENCES.accent;
  const persona = personaSchema.safeParse(row?.persona).success
    ? (row.persona as Persona)
    : DEFAULT_PREFERENCES.persona;
  const vibeFromRow = vibeSchema.safeParse(row?.vibe).success ? (row.vibe as Vibe) : mapPersonaToVibe(persona);

  return {
    userId,
    theme,
    accent,
    persona,
    vibe: vibeFromRow,
    onboardingDone: Boolean(row?.onboardingDone ?? DEFAULT_PREFERENCES.onboardingDone),
    funCardEnabled: Boolean(row?.funCardEnabled ?? DEFAULT_PREFERENCES.funCardEnabled),
    updatedAt: row?.updatedAt ?? null,
  };
}

async function getOrCreateUserPreferences(userId: string, requestId: string): Promise<PreferencesShape> {
  if (!isDatabaseHealthy()) {
    return { userId, ...DEFAULT_PREFERENCES };
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (rows[0]) {
      return normalizePreferencesRow(userId, rows[0]);
    }

    const defaults = { userId, ...DEFAULT_PREFERENCES, updatedAt: new Date() };
    await db.insert(userPreferences).values(defaults).onConflictDoNothing({
      target: userPreferences.userId,
    });
    return normalizePreferencesRow(userId, defaults);
  } catch (error) {
    logAuthDebug("preferences", requestId, "failed to read preferences, fallback defaults", {
      error: formatErrorForLog(error),
    }, "error");
    return { userId, ...DEFAULT_PREFERENCES };
  }
}

function getTelegramJwtSecret(): string {
  const secret = process.env.APP_AUTH_JWT_SECRET;
  if (!secret) {
    throw new AppError(
      "CONFIG_ERROR",
      "APP_AUTH_JWT_SECRET is required for Telegram custom auth tokens",
      500,
    );
  }
  return secret;
}

function isEmailIdentifier(identifier: string): boolean {
  return /^\S+@\S+\.\S+$/.test(identifier);
}

function getUserProviders(user: any): Set<string> {
  const providers = new Set<string>();

  const metaProviders = user?.app_metadata?.providers;
  if (Array.isArray(metaProviders)) {
    for (const provider of metaProviders) {
      if (typeof provider === "string" && provider.length > 0) {
        providers.add(provider);
      }
    }
  }

  const identities = user?.identities;
  if (Array.isArray(identities)) {
    for (const identity of identities) {
      const provider = identity?.provider;
      if (typeof provider === "string" && provider.length > 0) {
        providers.add(provider);
      }
    }
  }

  return providers;
}

function isRateLimitError(error: { status?: number | null; message?: string | null }): boolean {
  const status = typeof error.status === "number" ? error.status : 0;
  const message = (error.message ?? "").toLowerCase();
  return status === 429 || message.includes("rate limit");
}

async function findSupabaseUserByEmail(email: string, requestId: string) {
  const { data: adminUserRes, error: listUsersError } = await getSupabaseAdmin()
    .auth.admin.listUsers({ search: email });

  if (listUsersError) {
    logAuthDebug("login", requestId, "failed to list users for provider inspection", {
      lookupEmail: email,
      supabaseError: listUsersError.message,
    }, "error");
    return null;
  }

  return (
    adminUserRes?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
  );
}

function acquireInFlightLock(
  pool: Map<string, number>,
  key: string,
  ttlMs: number,
): boolean {
  const now = Date.now();
  const existing = pool.get(key);
  if (existing && now - existing < ttlMs) {
    return false;
  }

  pool.set(key, now);
  return true;
}

function releaseInFlightLock(pool: Map<string, number>, key: string) {
  pool.delete(key);
}

async function findSupabaseUserByUsername(normalizedUsername: string, requestId: string) {
  const maxPages = 50;
  const perPage = 200;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      logAuthDebug(
        "username-lookup",
        requestId,
        "failed to list users for username lookup",
        { supabaseError: error.message, page, perPage },
        "error",
      );
      throw new Error(error.message || "Failed to query auth users");
    }

    const users = data?.users ?? [];
    const matchedUser =
      users.find((user) => {
        const metadataUsername = user.user_metadata?.username;
        if (typeof metadataUsername !== "string") {
          return false;
        }
        return normalizeUsername(metadataUsername) === normalizedUsername;
      }) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function findSupabaseUserByTelegramId(telegramUserId: string, requestId: string) {
  const maxPages = 50;
  const perPage = 200;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      logAuthDebug(
        "telegram",
        requestId,
        "failed to list users for telegram lookup",
        { supabaseError: error.message, page, perPage },
        "error",
      );
      throw new Error(error.message || "Failed to query auth users");
    }

    const users = data?.users ?? [];
    const matchedUser =
      users.find((user) => {
        const metadataTelegramId = user.user_metadata?.telegram_user_id;
        return typeof metadataTelegramId === "string" && metadataTelegramId === telegramUserId;
      }) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function resolveSupabaseUserFromBearerToken(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await getSupabaseAdmin().auth.getUser(token);

  if (error || !user) {
    const customSecret = process.env.APP_AUTH_JWT_SECRET;
    if (!customSecret) {
      return null;
    }

    try {
      const payload = jwt.verify(token, customSecret) as { sub?: string; provider?: string };
      if (payload?.provider === "telegram" && payload.sub) {
        const {
          data: { user: telegramUser },
        } = await getSupabaseAdmin().auth.admin.getUserById(payload.sub);
        return telegramUser ?? null;
      }
    } catch {
      return null;
    }

    return null;
  }

  return user;
}

function signTelegramToken(userId: string, telegramUserId: string): string {
  const secret = getTelegramJwtSecret();

  return jwt.sign(
    {
      iss: "sypev_api",
      aud: "sypev_telegram",
      sub: userId,
      provider: "telegram",
      telegram_user_id: telegramUserId,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: TELEGRAM_TOKEN_TTL_SECONDS,
    },
  );
}

function getConfiguredTelegramBotUsername(): string | null {
  const fromEnv = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("@") ? fromEnv.slice(1) : fromEnv;
  }
  return null;
}

function normalizeHostname(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase();
    }
    return trimmed.split(":")[0].toLowerCase();
  } catch {
    return null;
  }
}

function getRequiredTelegramDomain(): string | null {
  const explicit = normalizeHostname(process.env.TELEGRAM_WIDGET_DOMAIN ?? "");
  if (explicit) {
    return explicit;
  }

  const fromAppUrl = normalizeHostname(process.env.APP_URL ?? "");
  if (fromAppUrl) {
    return fromAppUrl;
  }

  return null;
}

async function resolveTelegramBotUsername(requestId: string): Promise<string | null> {
  const fromEnv = getConfiguredTelegramBotUsername();
  if (fromEnv) {
    return fromEnv;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return null;
  }

  const now = Date.now();
  if (telegramBotConfigCache && now - telegramBotConfigCache.fetchedAt < TELEGRAM_CONFIG_CACHE_MS) {
    return telegramBotConfigCache.username;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`telegram_get_me_status_${response.status}`);
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      result?: { username?: string };
    };
    const username = payload.ok ? payload.result?.username ?? null : null;
    telegramBotConfigCache = { username, fetchedAt: now };
    return username;
  } catch (error) {
    logAuthDebug("telegram", requestId, "failed to resolve bot username", {
      error: formatErrorForLog(error),
    }, "error");
    telegramBotConfigCache = { username: null, fetchedAt: now };
    return null;
  }
}

router.get("/health-auth", authReadLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    const dbConfig = getDbConfigStatus();
    const supabaseConfig = getSupabaseConfigStatus();

    logAuthDebug("health-auth", requestId, "infra health requested", {
      dbConfig,
      supabaseConfig,
    });

    return res.status(200).json({
      ok: true,
      data: {
        database: dbConfig,
        supabase: supabaseConfig,
      },
    });
  } catch (error) {
    logAuthDebug("health-auth", requestId, "health route failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    }, "error");

    return res.status(200).json({
      ok: true,
      data: {
        database: {
          hasDatabaseUrl: false,
          dbClientInitialized: false,
          drizzleInitialized: false,
        },
        supabase: {
          hasUrl: false,
          hasAnonKey: false,
          hasServiceRoleKey: false,
        },
      },
    });
  }
});

router.get("/telegram/config", authReadLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const requiredDomain = getRequiredTelegramDomain();
  const originHost = normalizeHostname(
    typeof req.headers.origin === "string" ? req.headers.origin : "",
  );
  const headerHost = normalizeHostname(
    typeof req.headers.host === "string" ? req.headers.host : "",
  );
  const currentHost = originHost ?? headerHost;
  const domainMatch =
    !requiredDomain ||
    !currentHost ||
    currentHost === requiredDomain ||
    currentHost.endsWith(`.${requiredDomain}`);

  if (!botToken) {
    return res.json({
      ok: true,
      data: {
        enabled: false,
        botUsername: null,
        requiredDomain,
        currentHost,
        domainMatch: false,
        error: "Telegram bot is not configured",
      },
    });
  }

  if (!requiredDomain) {
    return res.json({
      ok: true,
      data: {
        enabled: false,
        botUsername: null,
        requiredDomain: null,
        currentHost,
        domainMatch: false,
        error:
          "Telegram widget domain is not configured. Set TELEGRAM_WIDGET_DOMAIN and BotFather /setdomain.",
      },
    });
  }

  if (!domainMatch) {
    return res.json({
      ok: true,
      data: {
        enabled: false,
        botUsername: null,
        requiredDomain,
        currentHost,
        domainMatch: false,
        error: `Bot domain invalid for this host. Configure BotFather /setdomain to ${requiredDomain} and open the app from that domain.`,
      },
    });
  }

  const botUsername = await resolveTelegramBotUsername(requestId);
  if (!botUsername) {
    return res.json({
      ok: true,
      data: {
        enabled: false,
        botUsername: null,
        requiredDomain,
        currentHost,
        domainMatch: Boolean(domainMatch),
        error: "Telegram bot username is unavailable",
      },
    });
  }

  return res.json({
    ok: true,
    data: {
      enabled: true,
      botUsername,
      botUrl: `https://t.me/${botUsername}`,
      requiredDomain,
      currentHost,
      domainMatch: Boolean(domainMatch),
      error: null,
    },
  });
});

router.get("/check-username", authReadLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    const rawUsername = typeof req.query.username === "string" ? req.query.username : "";
    const normalizedUsername = normalizeUsername(rawUsername);
    const validation = validateNormalizedUsername(normalizedUsername);

    logAuthDebug("check-username", requestId, "incoming request", {
      rawLength: rawUsername.length,
      hasAt: rawUsername.includes("@"),
      normalizedLength: normalizedUsername.length,
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    });

    if (!validation.valid) {
      return res.status(200).json({
        ok: true,
        data: {
          available: false,
          valid: false,
          normalizedUsername: null,
          error: validation.error,
        },
      });
    }

    if (isDatabaseHealthy()) {
      try {
        const db = getDb();
        const existing = await db
          .select({ userId: studentProfiles.userId })
          .from(studentProfiles)
          .where(eq(studentProfiles.username, normalizedUsername))
          .limit(1);
        logAuthDebug("check-username", requestId, "db lookup succeeded", {
          foundCount: existing.length,
        });
        return res.status(200).json({
          ok: true,
          data: {
            available: existing.length === 0,
            valid: true,
            normalizedUsername,
            error: null,
          },
        });
      } catch (dbError) {
        logAuthDebug(
          "check-username",
          requestId,
          "db lookup failure; falling back to supabase auth users",
          {
            error: formatErrorForLog(dbError),
            dbConfig: getDbConfigStatus(),
          },
          "error",
        );
      }
    }

    try {
      const matchedUser = await findSupabaseUserByUsername(normalizedUsername, requestId);
      return res.status(200).json({
        ok: true,
        data: {
          available: !matchedUser,
          valid: true,
          normalizedUsername,
          error: null,
        },
      });
    } catch (fallbackError) {
      logAuthDebug(
        "check-username",
        requestId,
        "fallback username lookup failed",
        { error: formatErrorForLog(fallbackError) },
        "error",
      );
      return res.status(200).json({
        ok: true,
        data: {
          available: false,
          valid: true,
          normalizedUsername,
          error: "Username service temporarily unavailable",
        },
      });
    }
  } catch (error) {
    logAuthDebug("check-username", requestId, "route failed", {
      error: formatErrorForLog(error),
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    }, "error");

    return res.status(200).json({
      ok: true,
      data: {
        available: false,
        valid: false,
        normalizedUsername: null,
        error: "Username service temporarily unavailable",
      },
    });
  }
});

router.post("/register", authLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();
  let registerLockKey: string | null = null;

  try {
    const input = parseWithSchema(registerSchema, req.body);
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    registerLockKey = `register:${email}`;

    if (!acquireInFlightLock(registerInFlight, registerLockKey, REGISTER_INFLIGHT_TTL_MS)) {
      return res.status(429).json({
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: "Too many signup attempts. Please wait before trying again.",
        },
      });
    }

    logAuthDebug("register", requestId, "incoming request", {
      emailDomain: email.split("@")[1] ?? "",
      hasName: Boolean(input.name),
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    });

    const { data: existingUsersRes, error: listUsersError } = await getSupabaseAdmin()
      .auth.admin.listUsers({ search: email });

    if (listUsersError) {
      logAuthDebug("register", requestId, "list users failed", {
        supabaseError: listUsersError.message,
      }, "error");
      return res.status(503).json({
        ok: false,
        error: {
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: "Registration service temporarily unavailable",
        },
      });
    }

    const hasExistingUser = Boolean(
      existingUsersRes?.users?.some((user) => user.email?.toLowerCase() === email),
    );
    if (hasExistingUser) {
      return res.status(409).json({
        ok: false,
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account with this email already exists",
        },
      });
    }

    const { data: created, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: input.name?.trim() || null,
        signup_provider: "email",
      },
    });

    if (createError || !created.user) {
      const message = createError?.message?.toLowerCase() ?? "";
      if (message.includes("already been registered")) {
        return res.status(409).json({
          ok: false,
          error: {
            code: "EMAIL_ALREADY_REGISTERED",
            message: "An account with this email already exists",
          },
        });
      }

      logAuthDebug("register", requestId, "create user failed", {
        supabaseError: createError?.message ?? null,
      }, "error");
      return res.status(503).json({
        ok: false,
        error: {
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: "Registration service temporarily unavailable",
        },
      });
    }

    try {
      await getDb()
        .insert(studentProfiles)
        .values({ userId: created.user.id })
        .onConflictDoNothing({ target: studentProfiles.userId });

      await getDb()
        .insert(userPreferences)
        .values({
          userId: created.user.id,
          ...DEFAULT_PREFERENCES,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: userPreferences.userId });
    } catch (dbError) {
      logAuthDebug("register", requestId, "profile row insert skipped due db failure", {
        userId: created.user.id,
        error: formatErrorForLog(dbError),
      }, "error");
    }

    const { data: authData, error: authError } = await getSupabaseAnon().auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session || !authData.user) {
      logAuthDebug("register", requestId, "sign in after register failed", {
        supabaseError: authError?.message ?? null,
      }, "error");
      return res.status(503).json({
        ok: false,
        error: {
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: "Registration completed but automatic login failed",
        },
      });
    }

    return res.json({
      ok: true,
      data: {
        session: authData.session,
        user: authData.user,
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.status === 400) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid registration payload",
        },
      });
    }

    logAuthDebug("register", requestId, "route failed", {
      error: formatErrorForLog(error),
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    }, "error");

    return res.status(503).json({
      ok: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Registration service temporarily unavailable",
      },
    });
  } finally {
    if (registerLockKey) {
      releaseInFlightLock(registerInFlight, registerLockKey);
    }
  }
});

router.post("/set-username", authLimiter, async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    const input = parseWithSchema(usernameSchema, req.body);
    const user = await resolveSupabaseUserFromBearerToken(req.headers.authorization);

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Missing or invalid auth token", 401);
    }

    const normalizedUsername = normalizeUsername(input.username);
    const validation = validateNormalizedUsername(normalizedUsername);

    if (!validation.valid) {
      throw new AppError("INVALID_INPUT", validation.error ?? "Invalid username", 400);
    }

    if (isDatabaseHealthy()) {
      try {
        const db = getDb();

        const existing = await db
          .select({ userId: studentProfiles.userId })
          .from(studentProfiles)
          .where(eq(studentProfiles.username, normalizedUsername))
          .limit(1);

        if (existing.length > 0 && existing[0].userId !== user.id) {
          throw new AppError("USERNAME_TAKEN", "This username is already taken", 409);
        }

        await db
          .insert(studentProfiles)
          .values({
            userId: user.id,
            username: normalizedUsername,
          })
          .onConflictDoUpdate({
            target: studentProfiles.userId,
            set: {
              username: normalizedUsername,
              updatedAt: new Date(),
            },
          });
      } catch (dbError) {
        if (dbError instanceof AppError) {
          throw dbError;
        }
        logAuthDebug(
          "set-username",
          requestId,
          "db write failed; using supabase metadata fallback",
          { error: formatErrorForLog(dbError) },
          "error",
        );
      }
    }

    try {
      const matchedUser = await findSupabaseUserByUsername(normalizedUsername, "set-username");
      if (matchedUser && matchedUser.id !== user.id) {
        throw new AppError("USERNAME_TAKEN", "This username is already taken", 409);
      }
    } catch (lookupError) {
      if (lookupError instanceof AppError) {
        throw lookupError;
      }
      logAuthDebug(
        "set-username",
        requestId,
        "supabase username uniqueness lookup failed",
        { error: formatErrorForLog(lookupError) },
        "error",
      );
      throw new AppError(
        "AUTH_SERVICE_UNAVAILABLE",
        "Username service temporarily unavailable",
        503,
      );
    }

    const mergedMetadata = {
      ...(user.user_metadata ?? {}),
      username: normalizedUsername,
    };

    const { error: metadataUpdateError } = await getSupabaseAdmin().auth.admin.updateUserById(
      user.id,
      {
        user_metadata: mergedMetadata,
      },
    );

    if (metadataUpdateError) {
      logAuthDebug(
        "set-username",
        requestId,
        "supabase metadata update failed",
        { supabaseError: metadataUpdateError.message },
        "error",
      );
      throw new AppError(
        "AUTH_SERVICE_UNAVAILABLE",
        "Username service temporarily unavailable",
        503,
      );
    }

    return res.json({
      ok: true,
      data: {
        username: normalizedUsername,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return res.status(503).json({
      ok: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Username service temporarily unavailable",
      },
    });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();
  let loginLockKey: string | null = null;

  try {
    const input = parseWithSchema(loginSchema, req.body);

    const identifier = input.identifier.trim();
    const password = input.password;
    const identifierIsEmail = isEmailIdentifier(identifier);
    loginLockKey = `login:${identifier.toLowerCase()}`;

    if (!acquireInFlightLock(loginInFlight, loginLockKey, LOGIN_INFLIGHT_TTL_MS)) {
      return res.status(429).json({
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: "Too many login attempts. Please wait and try again.",
        },
      });
    }

    logAuthDebug("login", requestId, "incoming request", {
      identifierIsEmail,
      identifierLength: identifier.length,
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    });

    let emailForLogin: string;

    if (identifierIsEmail) {
      emailForLogin = identifier.toLowerCase();
    } else {
      const normalizedUsername = normalizeUsername(identifier);
      const validation = validateNormalizedUsername(normalizedUsername);

      logAuthDebug("login", requestId, "identifier treated as username", {
        normalizedUsernameLength: normalizedUsername.length,
        usernameValid: validation.valid,
      });

      if (!validation.valid) {
        return res.status(401).json({
          ok: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        });
      }

      let usernameUserId: string | null = null;
      if (isDatabaseHealthy()) {
        try {
          const db = getDb();
          const profile = await db
            .select({ userId: studentProfiles.userId })
            .from(studentProfiles)
            .where(eq(studentProfiles.username, normalizedUsername))
            .limit(1);
          usernameUserId = profile[0]?.userId ?? null;
        } catch (dbError) {
          logAuthDebug("login", requestId, "username lookup db failure; fallback to supabase", {
            error: formatErrorForLog(dbError),
          });
        }
      }

      let userFromLookup = null;
      if (usernameUserId) {
        const {
          data: { user },
          error: userLookupError,
        } = await getSupabaseAdmin().auth.admin.getUserById(usernameUserId);

        if (userLookupError || !user?.email) {
          logAuthDebug("login", requestId, "supabase user lookup failure", {
            hasUser: Boolean(user),
            supabaseError: userLookupError?.message ?? null,
          });
          return res.status(401).json({
            ok: false,
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid credentials",
            },
          });
        }

        userFromLookup = user;
      } else {
        try {
          userFromLookup = await findSupabaseUserByUsername(normalizedUsername, requestId);
        } catch (fallbackError) {
          logAuthDebug("login", requestId, "username lookup fallback failure", {
            error: formatErrorForLog(fallbackError),
          }, "error");
          return res.status(503).json({
            ok: false,
            error: {
              code: "AUTH_SERVICE_UNAVAILABLE",
              message: "Login service temporarily unavailable",
            },
          });
        }
      }

      if (!userFromLookup?.email) {
        logAuthDebug("login", requestId, "username not found", {
          normalizedUsername,
        });
        return res.status(401).json({
          ok: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        });
      }

      emailForLogin = userFromLookup.email;
    }

    const { data: authData, error: authError } = await getSupabaseAnon().auth.signInWithPassword(
      {
        email: emailForLogin,
        password,
      },
    );

    if (authError || !authData.session || !authData.user) {
      if (isRateLimitError(authError ?? {})) {
        return res.status(429).json({
          ok: false,
          error: {
            code: "RATE_LIMIT",
            message: "Too many login attempts. Please wait and try again.",
          },
        });
      }

      const existingUser = await findSupabaseUserByEmail(emailForLogin, requestId);
      if (existingUser) {
        const providers = getUserProviders(existingUser);
        const hasEmailProvider = providers.has("email");
        const hasGoogleProvider = providers.has("google");

        logAuthDebug("login", requestId, "password login rejected for existing account", {
          identifierIsEmail,
          userId: existingUser.id,
          providers: Array.from(providers),
          hasEmailProvider,
          hasGoogleProvider,
        });

        if (!hasEmailProvider && hasGoogleProvider) {
          return res.status(401).json({
            ok: false,
            error: {
              code: "SOCIAL_LOGIN_REQUIRED",
              message: "This account was created with Google. Please sign in with Google.",
            },
          });
        }
      }

      logAuthDebug("login", requestId, "supabase password auth failure", {
        hasSession: Boolean(authData?.session),
        hasUser: Boolean(authData?.user),
        supabaseError: authError?.message ?? null,
      }, "error");
      return res.status(401).json({
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        },
      });
    }

    return res.json({
      ok: true,
      data: {
        session: authData.session,
        user: authData.user,
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.status === 400) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        },
      });
    }

    logAuthDebug("login", requestId, "route failed", {
      error: formatErrorForLog(error),
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    }, "error");

    return res.status(503).json({
      ok: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Login service temporarily unavailable",
      },
    });
  } finally {
    if (loginLockKey) {
      releaseInFlightLock(loginInFlight, loginLockKey);
    }
  }
});

router.post("/telegram", authLimiter, async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    const input = parseWithSchema(telegramAuthSchema, req.body) as TelegramAuthData;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new AppError("CONFIG_ERROR", "TELEGRAM_BOT_TOKEN is missing", 500);
    }

    if (!validateTelegramAuth(input, botToken)) {
      throw new AppError("INVALID_AUTH", "Invalid Telegram auth signature", 401);
    }

    const telegramUserId = String(input.id);
    let db: ReturnType<typeof getDb> | null = null;
    if (isDatabaseHealthy()) {
      try {
        db = getDb();
      } catch (dbError) {
        logAuthDebug("telegram", requestId, "db unavailable, using supabase-only fallback", {
          error: formatErrorForLog(dbError),
        }, "error");
      }
    }

    const sessionUser = await resolveSupabaseUserFromBearerToken(req.headers.authorization);

    if (sessionUser) {
      logAuthDebug("telegram", requestId, "linking telegram to existing user", {
        userId: sessionUser.id,
        telegramUserId,
        dbConfig: getDbConfigStatus(),
        supabaseConfig: getSupabaseConfigStatus(),
      });

      let linkedUserId: string | null = null;
      if (db) {
        try {
          const existingProviderLink = await db
            .select({ id: linkedIdentities.id, userId: linkedIdentities.userId })
            .from(linkedIdentities)
            .where(
              and(
                eq(linkedIdentities.provider, "telegram"),
                eq(linkedIdentities.providerUserId, telegramUserId),
              ),
            )
            .limit(1);
          linkedUserId = existingProviderLink[0]?.userId ?? null;
        } catch (dbError) {
          logAuthDebug("telegram", requestId, "db lookup failed while linking", {
            error: formatErrorForLog(dbError),
          }, "error");
        }
      }

      if (!linkedUserId) {
        try {
          const metadataUser = await findSupabaseUserByTelegramId(telegramUserId, requestId);
          linkedUserId = metadataUser?.id ?? null;
        } catch {
          linkedUserId = null;
        }
      }

      if (linkedUserId) {
        if (linkedUserId === sessionUser.id) {
          return res.json({
            ok: true,
            data: {
              linked: true,
              provider: "telegram",
              userId: sessionUser.id,
            },
          });
        }

        logAuthDebug("telegram", requestId, "link attempt conflicts with existing link", {
          userId: sessionUser.id,
          telegramUserId,
          linkedUserId,
        }, "error");
        throw new AppError("PROVIDER_CONFLICT", "Telegram account is already linked", 409);
      }

      const metadataForLink = {
        ...(sessionUser.user_metadata ?? {}),
        telegram_user_id: telegramUserId,
        telegram_username: input.username ?? null,
      };

      const { error: updateMetadataError } = await getSupabaseAdmin().auth.admin.updateUserById(
        sessionUser.id,
        { user_metadata: metadataForLink },
      );

      if (updateMetadataError) {
        logAuthDebug("telegram", requestId, "telegram metadata update failed", {
          userId: sessionUser.id,
          telegramUserId,
          supabaseError: updateMetadataError.message,
        }, "error");
        throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Telegram linking failed", 503);
      }

      if (db) {
        await db
          .insert(linkedIdentities)
          .values({
            userId: sessionUser.id,
            provider: "telegram",
            providerUserId: telegramUserId,
          })
          .onConflictDoNothing({
            target: [linkedIdentities.provider, linkedIdentities.providerUserId],
          });
      }

      return res.json({
        ok: true,
        data: {
          linked: true,
          provider: "telegram",
          userId: sessionUser.id,
        },
      });
    }

    logAuthDebug("telegram", requestId, "login via telegram widget", {
      telegramUserId,
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    });

    let userId: string;
    let existingLinkedUserId: string | null = null;
    if (db) {
      try {
        const existingLink = await db
          .select({ userId: linkedIdentities.userId })
          .from(linkedIdentities)
          .where(
            and(
              eq(linkedIdentities.provider, "telegram"),
              eq(linkedIdentities.providerUserId, telegramUserId),
            ),
          )
          .limit(1);
        existingLinkedUserId = existingLink[0]?.userId ?? null;
      } catch (dbError) {
        logAuthDebug("telegram", requestId, "db lookup failed for telegram login", {
          error: formatErrorForLog(dbError),
        }, "error");
      }
    }

    if (!existingLinkedUserId) {
      try {
        const metadataLinkedUser = await findSupabaseUserByTelegramId(telegramUserId, requestId);
        existingLinkedUserId = metadataLinkedUser?.id ?? null;
      } catch (lookupError) {
        logAuthDebug("telegram", requestId, "telegram metadata lookup failed", {
          error: formatErrorForLog(lookupError),
        }, "error");
      }
    }

    if (existingLinkedUserId) {
      userId = existingLinkedUserId;
      logAuthDebug("telegram", requestId, "found existing telegram-linked user", { userId });
    } else {
      const syntheticEmail = `telegram_${telegramUserId}@users.telegram.local`;
      const generatedPassword = randomBytes(48).toString("hex");

      const { data: created, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
        email: syntheticEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          name: getTelegramDisplayName(input),
          telegram_user_id: telegramUserId,
          telegram_username: input.username ?? null,
          signup_provider: "telegram",
        },
      });

      if (createError || !created.user) {
        if (createError && createError.message.toLowerCase().includes("already been registered")) {
          const existingUser = await findSupabaseUserByEmail(syntheticEmail, requestId);
          if (existingUser) {
            userId = existingUser.id;
          } else {
            throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Telegram login failed", 503);
          }
        } else {
          logAuthDebug("telegram", requestId, "supabase user creation failed", {
            supabaseError: createError?.message ?? null,
          }, "error");
          throw new AppError("CREATE_FAILED", "Failed to create Telegram account", 500);
        }
      } else {
        userId = created.user.id;
      }

      const {
        data: { user: createdOrExistingUser },
      } = await getSupabaseAdmin().auth.admin.getUserById(userId);

      if (createdOrExistingUser) {
        const metadata = {
          ...(createdOrExistingUser.user_metadata ?? {}),
          telegram_user_id: telegramUserId,
          telegram_username: input.username ?? null,
          signup_provider:
            createdOrExistingUser.user_metadata?.signup_provider ?? "telegram",
        };
        await getSupabaseAdmin().auth.admin.updateUserById(userId, { user_metadata: metadata });
      }
    }

    if (db) {
      await db
        .insert(linkedIdentities)
        .values({
          userId,
          provider: "telegram",
          providerUserId: telegramUserId,
        })
        .onConflictDoNothing({
          target: [linkedIdentities.provider, linkedIdentities.providerUserId],
        });

      await db
        .insert(studentProfiles)
        .values({ userId })
        .onConflictDoNothing({ target: studentProfiles.userId });

      await db
        .insert(userPreferences)
        .values({
          userId,
          ...DEFAULT_PREFERENCES,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: userPreferences.userId });
    }

    const accessToken = signTelegramToken(userId, telegramUserId);

    logAuthDebug("telegram", requestId, "issued telegram access token", {
      userId,
    });

    return res.json({
      ok: true,
      data: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: TELEGRAM_TOKEN_TTL_SECONDS,
      },
    });
  } catch (error) {
    logAuthDebug("telegram", requestId, "route failed", {
      error: formatErrorForLog(error),
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    }, "error");
    next(error);
  }
});

router.patch("/preferences", authLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    const input = parseWithSchema(preferencesUpdateSchema, req.body);
    const current = await getOrCreateUserPreferences(req.user.id, requestId);
    const nextPersona = input.persona ?? current.persona;
    const nextVibe = input.vibe ?? mapPersonaToVibe(nextPersona);

    const nextPayload: PreferencesShape = {
      ...current,
      theme: input.theme ?? current.theme,
      accent: input.accent ?? current.accent,
      persona: nextPersona,
      vibe: nextVibe,
      onboardingDone: input.onboardingDone ?? current.onboardingDone,
      funCardEnabled: input.funCardEnabled ?? current.funCardEnabled,
      updatedAt: new Date(),
    };

    if (isDatabaseHealthy()) {
      try {
        const db = getDb();
        await db
          .insert(userPreferences)
          .values(nextPayload)
          .onConflictDoUpdate({
            target: userPreferences.userId,
            set: {
              theme: nextPayload.theme,
              accent: nextPayload.accent,
              vibe: nextPayload.vibe,
              persona: nextPayload.persona,
              onboardingDone: nextPayload.onboardingDone,
              funCardEnabled: nextPayload.funCardEnabled,
              updatedAt: new Date(),
            },
          });
      } catch (dbError) {
        logAuthDebug("preferences", requestId, "preferences db write failed", {
          userId: req.user.id,
          error: formatErrorForLog(dbError),
        }, "error");
        return res.status(503).json({
          ok: false,
          error: {
            code: "AUTH_SERVICE_UNAVAILABLE",
            message: "Preferences service temporarily unavailable",
          },
        });
      }
    }

    return res.json({
      ok: true,
      data: {
        ...nextPayload,
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.status === 400) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid preferences payload",
        },
      });
    }

    logAuthDebug("preferences", requestId, "route failed", {
      error: formatErrorForLog(error),
    }, "error");
    return res.status(503).json({
      ok: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Preferences service temporarily unavailable",
      },
    });
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const requestId = ((req as { id?: string }).id ?? "unknown").toString();
    if (!req.user) {
      return res.json({ ok: true, data: { user: null } });
    }

    let profileRows: any[] = [];
    let providerRows: { provider: string; linkedAt: Date }[] = [];
    const preferences = await getOrCreateUserPreferences(req.user.id, requestId);
    try {
      const db = getDb();
      profileRows = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, req.user.id))
        .limit(1);

      providerRows = await db
        .select({ provider: linkedIdentities.provider, linkedAt: linkedIdentities.linkedAt })
        .from(linkedIdentities)
        .where(eq(linkedIdentities.userId, req.user.id));
    } catch {
      // Graceful degradation: keep /me available even if DB is temporarily down.
      profileRows = [];
      providerRows = [];
    }

    const {
      data: { user: adminUser },
    } = await getSupabaseAdmin().auth.admin.getUserById(req.user.id);

    const nativeProviders = (adminUser?.identities ?? [])
      .map((identity) => ({
        provider: identity.provider,
        linkedAt: identity.created_at ? new Date(identity.created_at).getTime() : Date.now(),
      }))
      .filter((item): item is { provider: string; linkedAt: number } => Boolean(item.provider));

    const providersMap = new Map<string, number>();

    for (const provider of nativeProviders) {
      providersMap.set(provider.provider, provider.linkedAt);
    }

    for (const row of providerRows) {
      providersMap.set(row.provider, new Date(row.linkedAt).getTime());
    }

    if (typeof adminUser?.user_metadata?.telegram_user_id === "string") {
      providersMap.set("telegram", Date.now());
    }

    const profile = profileRows[0] ?? null;
    const profileInterests = parseInterests(profile?.interestsJson);
    const metadataInterests = Array.isArray(adminUser?.user_metadata?.interests)
      ? (adminUser?.user_metadata?.interests as unknown[])
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.toLowerCase())
      : [];
    const usernameFromMetadata =
      typeof adminUser?.user_metadata?.username === "string"
        ? normalizeUsername(adminUser.user_metadata.username)
        : null;
    const effectiveUsername = profile?.username ?? usernameFromMetadata;
    const onboardingByProfile = profileHasCompletedOnboarding(profile);
    const onboardingDone = Boolean(preferences.onboardingDone && onboardingByProfile);

    return res.json({
      ok: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email ?? null,
          username: effectiveUsername ?? null,
          name:
            [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
            (req.user.user_metadata?.name as string | undefined) ||
            "User",
          isAdmin: 0,
          isVerified: req.user.email_confirmed_at ? 1 : 0,
          needsUsername: !effectiveUsername,
          needsOnboarding: !onboardingDone,
        },
        profile: profile
          ? {
              ...profile,
              interests: profileInterests.length > 0 ? profileInterests : metadataInterests,
            }
          : null,
        preferences: {
          ...preferences,
          onboardingDone,
        },
        providers: Array.from(providersMap.entries()).map(([provider, linkedAt]) => ({
          provider,
          linkedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/set-password", authLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const input = parseWithSchema(setPasswordSchema, req.body);
    logAuthDebug("set-password", requestId, "password update requested", {
      userId: req.user.id,
      hasSupabaseEmail: Boolean(req.user.email),
    });

    const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(req.user.id, {
      password: input.password,
    });

    if (error || !data.user) {
      logAuthDebug("set-password", requestId, "password update failed", {
        supabaseError: error?.message ?? null,
      }, "error");
      return res.status(503).json({
        ok: false,
        error: { code: "AUTH_SERVICE_UNAVAILABLE", message: "Password update failed" },
      });
    }

    return res.json({ ok: true, data: { updated: true } });
  } catch (error) {
    logAuthDebug("set-password", requestId, "route failed", {
      error: formatErrorForLog(error),
    }, "error");
    return res.status(503).json({
      ok: false,
      error: { code: "AUTH_SERVICE_UNAVAILABLE", message: "Password update failed" },
    });
  }
});

router.post("/logout", async (_req, res) => {
  return res.json({ ok: true, data: { loggedOut: true } });
});

router.post("/admin-login", authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const isProduction = process.env.NODE_ENV === "production";
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD &&
      username !== undefined
    ) {
      res.cookie("sypev_admin", "true", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return res.json({ ok: true, data: { admin: true } });
    }
    throw new AppError("UNAUTHORIZED", "Invalid admin credentials", 401);
  } catch (error) {
    next(error);
  }
});

router.post("/admin-logout", async (_req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("sypev_admin", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });
    res.json({ ok: true, data: { loggedOut: true } });
  } catch (error) {
    next(error);
  }
});

router.get("/admin-me", async (req, res, next) => {
  try {
    const adminCookie = req.cookies?.sypev_admin;
    if (adminCookie) {
      return res.json({ ok: true, data: { admin: true } });
    }
    return res.json({ ok: true, data: { admin: false } });
  } catch (error) {
    next(error);
  }
});

export default router;
