import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import jwt from "jsonwebtoken";

import { getDb, getDbConfigStatus } from "../db";
import { linkedIdentities, studentProfiles } from "../db/schema";
import { validateTelegramAuth, getTelegramDisplayName, type TelegramAuthData } from "../services/telegramAuth";
import { getSupabaseAdmin, getSupabaseAnon, getSupabaseConfigStatus } from "../utils/supabase";
import { AppError } from "../utils/error";
import { authLimiter, authReadLimiter } from "../middleware/rateLimit";
import { parseWithSchema } from "../utils/validation";
import {
  loginSchema,
  telegramAuthSchema,
  usernameSchema,
  normalizeUsername,
  validateNormalizedUsername,
} from "../validators/auth";
import { z } from "zod";

const router = Router();

const TELEGRAM_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const setPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

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
) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.error(`[auth:${scope}][${requestId}] ${message}${payload}`);
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
    return null;
  }

  return user;
}

function signTelegramToken(userId: string, telegramUserId: string): string {
  const secret = getTelegramJwtSecret();

  return jwt.sign(
    {
      iss: "test_bro_api",
      aud: "test_bro_telegram",
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
    });

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

    let existing: { userId: string }[] = [];
    try {
      const db = getDb();
      existing = await db
        .select({ userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(eq(studentProfiles.username, normalizedUsername))
        .limit(1);
      logAuthDebug("check-username", requestId, "db lookup succeeded", {
        foundCount: existing.length,
      });
    } catch (dbError) {
      logAuthDebug("check-username", requestId, "db lookup failure", {
        error: formatErrorForLog(dbError),
        dbConfig: getDbConfigStatus(),
      });
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

    return res.status(200).json({
      ok: true,
      data: {
        available: existing.length === 0,
        valid: true,
        normalizedUsername,
        error: null,
      },
    });
  } catch (error) {
    logAuthDebug("check-username", requestId, "route failed", {
      error: formatErrorForLog(error),
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    });

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

router.post("/set-username", authLimiter, async (req, res, next) => {
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

    return res.json({
      ok: true,
      data: {
        username: normalizedUsername,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", authLimiter, async (req, res) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    const input = parseWithSchema(loginSchema, req.body);

    const identifier = input.identifier.trim();
    const password = input.password;
    const identifierIsEmail = isEmailIdentifier(identifier);

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

      let profile;
      try {
        const db = getDb();
        profile = await db
          .select({ userId: studentProfiles.userId })
          .from(studentProfiles)
          .where(eq(studentProfiles.username, normalizedUsername))
          .limit(1);
      } catch (dbError) {
        logAuthDebug("login", requestId, "username lookup db failure", {
          error: formatErrorForLog(dbError),
        });
        return res.status(503).json({
          ok: false,
          error: {
            code: "AUTH_SERVICE_UNAVAILABLE",
            message: "Login service temporarily unavailable",
          },
        });
      }

      if (!profile || profile.length === 0) {
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

      const {
        data: { user },
        error: userLookupError,
      } = await getSupabaseAdmin().auth.admin.getUserById(profile[0].userId);

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

      emailForLogin = user.email;
    }

    const { data: authData, error: authError } = await getSupabaseAnon().auth.signInWithPassword(
      {
        email: emailForLogin,
        password,
      },
    );

    if (authError || !authData.session || !authData.user) {
      const { data: adminUserRes, error: listUsersError } = await getSupabaseAdmin()
        .auth.admin.listUsers({ search: emailForLogin });

      if (!listUsersError) {
        const existingUser = adminUserRes?.users?.find(
          (u) => u.email?.toLowerCase() === emailForLogin.toLowerCase(),
        );

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
      }

      logAuthDebug("login", requestId, "supabase password auth failure", {
        hasSession: Boolean(authData?.session),
        hasUser: Boolean(authData?.user),
        supabaseError: authError?.message ?? null,
      });
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
    logAuthDebug("login", requestId, "route failed", {
      error: formatErrorForLog(error),
      dbConfig: getDbConfigStatus(),
      supabaseConfig: getSupabaseConfigStatus(),
    });

    return res.status(503).json({
      ok: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Login service temporarily unavailable",
      },
    });
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

    const db = getDb();
    const telegramUserId = String(input.id);

    const sessionUser = await resolveSupabaseUserFromBearerToken(req.headers.authorization);

    if (sessionUser) {
      logAuthDebug("telegram", requestId, "linking telegram to existing user", {
        userId: sessionUser.id,
        telegramUserId,
        dbConfig: getDbConfigStatus(),
        supabaseConfig: getSupabaseConfigStatus(),
      });

      const existingProviderLink = await db
        .select({ id: linkedIdentities.id })
        .from(linkedIdentities)
        .where(
          and(
            eq(linkedIdentities.provider, "telegram"),
            eq(linkedIdentities.providerUserId, telegramUserId),
          ),
        )
        .limit(1);

      if (existingProviderLink.length > 0) {
        logAuthDebug("telegram", requestId, "link attempt conflicts with existing link", {
          userId: sessionUser.id,
          telegramUserId,
          existingLinkId: existingProviderLink[0].id,
        });
        throw new AppError("PROVIDER_CONFLICT", "Telegram account is already linked", 409);
      }

      await db.insert(linkedIdentities).values({
        userId: sessionUser.id,
        provider: "telegram",
        providerUserId: telegramUserId,
      });

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

    let userId: string;

    if (existingLink.length > 0) {
      userId = existingLink[0].userId;
      logAuthDebug("telegram", requestId, "found existing telegram-linked user", {
        userId,
      });
    } else {
      const syntheticEmail = `telegram_${telegramUserId}@users.telegram.local`;
      const generatedPassword = randomBytes(48).toString("hex");

      const { data: created, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
        email: syntheticEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          name: getTelegramDisplayName(input),
          telegram_username: input.username ?? null,
          signup_provider: "telegram",
        },
      });

      if (createError || !created.user) {
        logAuthDebug("telegram", requestId, "supabase user creation failed", {
          supabaseError: createError?.message ?? null,
        });
        throw new AppError("CREATE_FAILED", "Failed to create Telegram account", 500);
      }

      userId = created.user.id;

      await db.insert(linkedIdentities).values({
        userId,
        provider: "telegram",
        providerUserId: telegramUserId,
      });

      await db
        .insert(studentProfiles)
        .values({ userId })
        .onConflictDoNothing({ target: studentProfiles.userId });
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
    });
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ ok: true, data: { user: null } });
    }

    const db = getDb();

    const profileRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);

    const providerRows = await db
      .select({ provider: linkedIdentities.provider, linkedAt: linkedIdentities.linkedAt })
      .from(linkedIdentities)
      .where(eq(linkedIdentities.userId, req.user.id));

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

    const profile = profileRows[0] ?? null;

    return res.json({
      ok: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email ?? null,
          username: profile?.username ?? null,
          name: (req.user.user_metadata?.name as string | undefined) ?? "User",
          isAdmin: 0,
          isVerified: req.user.email_confirmed_at ? 1 : 0,
          needsUsername: !profile?.username,
        },
        profile,
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
      });
      return res.status(503).json({
        ok: false,
        error: { code: "AUTH_SERVICE_UNAVAILABLE", message: "Password update failed" },
      });
    }

    return res.json({ ok: true, data: { updated: true } });
  } catch (error) {
    logAuthDebug("set-password", requestId, "route failed", {
      error: formatErrorForLog(error),
    });
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
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD &&
      username !== undefined
    ) {
      res.cookie("sypev_admin", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
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
    res.clearCookie("sypev_admin", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
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
