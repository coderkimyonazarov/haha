import { createHash, randomBytes } from "crypto";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { getDb, getDbConfigStatus, isDatabaseHealthy } from "../db";
import {
  auditLogs,
  botLinkTokens,
  linkedIdentities,
  studentProfiles,
  universities,
  userPreferences,
} from "../db/schema";
import { sendTutorPrompt } from "../services/aiProvider";
import { AppError } from "../utils/error";
import { getSupabaseAdmin, getSupabaseConfigStatus } from "../utils/supabase";

const router = Router();

const LINK_TOKEN_TTL_MS = 1000 * 60 * 15;
const BOT_AI_WINDOW_MS = 1000 * 60 * 5;
const BOT_AI_LIMIT = 8;

const botAiRateMap = new Map<string, number[]>();

const botIdentitySchema = z.object({
  telegramUserId: z.string().min(3).max(64),
  telegramUsername: z.string().min(1).max(64).optional().nullable(),
});

const botLinkWithTokenSchema = botIdentitySchema.extend({
  token: z.string().min(12).max(256),
});

const botAiSchema = botIdentitySchema.extend({
  message: z.string().min(2).max(4000),
  context: z.enum(["SAT", "Admissions", "General"]).optional().default("General"),
});

type ResolvedUser = {
  id: string;
  email: string | null;
  name: string;
  username: string | null;
  needsUsername: boolean;
  needsOnboarding: boolean;
  profile: {
    gender: string | null;
    birthYear: number | null;
    country: string | null;
    targetMajor: string | null;
    satMath: number | null;
    satReadingWriting: number | null;
    satTotal: number | null;
    interests: string[];
  };
  preferences: {
    theme: string;
    persona: string;
    vibe: string;
    accent: string;
    funCardEnabled: boolean;
  };
  providers: string[];
};

function normalizeTelegramBotUsername(): string | null {
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!raw) {
    return null;
  }
  return raw.startsWith("@") ? raw.slice(1) : raw;
}

function getAppOrigin(): string {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && /^https?:\/\//i.test(appUrl)) {
    return appUrl.replace(/\/$/, "");
  }
  return "https://www.sypev.com";
}

function getBotInternalSecret(): string {
  const value =
    process.env.BOT_INTERNAL_API_KEY?.trim() ||
    process.env.APP_AUTH_JWT_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim();
  if (!value) {
    throw new AppError(
      "CONFIG_ERROR",
      "BOT_INTERNAL_API_KEY is missing. Internal bot API is disabled.",
      503,
    );
  }
  return value;
}

function assertInternalBotRequest(req: any) {
  const expected = getBotInternalSecret();
  const received = String(req.headers["x-bot-secret"] ?? "").trim();
  if (!received || received !== expected) {
    throw new AppError("UNAUTHORIZED", "Invalid bot credentials", 401);
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeAiReply(raw: string): string {
  let next = raw.trim();
  next = next.replace(/^[\s\n]*\d+\.\s*(main answer|website improvement idea|possible risk\/error).*$/gim, "");
  next = next.replace(/salom\s+foydalanuvchi\s+noma'?lum/gi, "Salom");
  next = next.replace(/\n{3,}/g, "\n\n").trim();
  return next;
}

function cleanRateMap(now: number) {
  for (const [key, values] of botAiRateMap.entries()) {
    const next = values.filter((value) => now - value < BOT_AI_WINDOW_MS);
    if (next.length === 0) {
      botAiRateMap.delete(key);
    } else {
      botAiRateMap.set(key, next);
    }
  }
}

function checkBotAiRateLimit(telegramUserId: string): boolean {
  const now = Date.now();
  cleanRateMap(now);
  const current = botAiRateMap.get(telegramUserId) ?? [];
  if (current.length >= BOT_AI_LIMIT) {
    return false;
  }
  current.push(now);
  botAiRateMap.set(telegramUserId, current);
  return true;
}

function formatLogError(error: unknown) {
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

function logBot(scope: string, requestId: string, message: string, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[bot:${scope}][${requestId}] ${message}${payload}`);
}

async function findSupabaseUserByTelegramId(telegramUserId: string, requestId: string) {
  const maxPages = 30;
  const perPage = 200;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({ page, perPage });

    if (error) {
      logBot("resolve", requestId, "supabase listUsers failed", { page, perPage, error: error.message });
      throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Provider lookup unavailable", 503);
    }

    const users = data?.users ?? [];
    const matched = users.find((user) => {
      const metadataTelegramId = user.user_metadata?.telegram_user_id;
      return typeof metadataTelegramId === "string" && metadataTelegramId === telegramUserId;
    });

    if (matched) {
      return matched;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function resolveUserByTelegramId(telegramUserId: string, requestId: string): Promise<ResolvedUser | null> {
  let userId: string | null = null;

  if (isDatabaseHealthy()) {
    try {
      const db = getDb();
      const linkedRows = await db
        .select({ userId: linkedIdentities.userId })
        .from(linkedIdentities)
        .where(
          and(
            eq(linkedIdentities.provider, "telegram"),
            eq(linkedIdentities.providerUserId, telegramUserId),
          ),
        )
        .limit(1);
      userId = linkedRows[0]?.userId ?? null;
    } catch (error) {
      logBot("resolve", requestId, "db linked identity lookup failed", {
        error: formatLogError(error),
        dbConfig: getDbConfigStatus(),
      });
    }
  }

  if (!userId) {
    const metadataUser = await findSupabaseUserByTelegramId(telegramUserId, requestId);
    userId = metadataUser?.id ?? null;
  }

  if (!userId) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await getSupabaseAdmin().auth.admin.getUserById(userId);

  if (userError || !user) {
    logBot("resolve", requestId, "supabase getUserById failed", {
      userId,
      error: userError?.message ?? "unknown",
    });
    throw new AppError("AUTH_SERVICE_UNAVAILABLE", "User lookup unavailable", 503);
  }

  let profileRow: any | null = null;
  let preferencesRow: any | null = null;
  let providers: string[] = [];

  if (isDatabaseHealthy()) {
    try {
      const db = getDb();
      const [profileRows, preferenceRows, providerRows] = await Promise.all([
        db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id)).limit(1),
        db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1),
        db
          .select({ provider: linkedIdentities.provider })
          .from(linkedIdentities)
          .where(eq(linkedIdentities.userId, user.id)),
      ]);

      profileRow = profileRows[0] ?? null;
      preferencesRow = preferenceRows[0] ?? null;
      providers = providerRows.map((row) => row.provider);
    } catch (error) {
      logBot("resolve", requestId, "db profile lookup failed", {
        userId: user.id,
        error: formatLogError(error),
      });
    }
  }

  const metadataUsername = typeof user.user_metadata?.username === "string" ? user.user_metadata.username : null;
  const username = profileRow?.username ?? metadataUsername;
  const interests = parseInterests(profileRow?.interestsJson);

  const onboardingByProfile = Boolean(
    profileRow?.firstName &&
      profileRow?.lastName &&
      profileRow?.gender &&
      profileRow?.birthYear &&
      interests.length > 0,
  );

  const needsUsername = !username;
  const needsOnboarding = !Boolean(preferencesRow?.onboardingDone && onboardingByProfile);

  if (Array.isArray(user.identities)) {
    for (const identity of user.identities) {
      if (typeof identity.provider === "string" && identity.provider.length > 0) {
        providers.push(identity.provider);
      }
    }
  }

  if (typeof user.user_metadata?.telegram_user_id === "string") {
    providers.push("telegram");
  }

  providers = Array.from(new Set(providers));

  const fullName =
    [profileRow?.firstName, profileRow?.lastName].filter(Boolean).join(" ").trim() ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "User");

  return {
    id: user.id,
    email: user.email ?? null,
    name: fullName,
    username: username ?? null,
    needsUsername,
    needsOnboarding,
    profile: {
      gender: profileRow?.gender ?? null,
      birthYear: profileRow?.birthYear ?? null,
      country: profileRow?.country ?? null,
      targetMajor: profileRow?.targetMajor ?? null,
      satMath: profileRow?.satMath ?? null,
      satReadingWriting: profileRow?.satReadingWriting ?? null,
      satTotal: profileRow?.satTotal ?? null,
      interests,
    },
    preferences: {
      theme: preferencesRow?.theme ?? "system",
      persona: preferencesRow?.persona ?? "clean_minimal",
      vibe: preferencesRow?.vibe ?? "minimal",
      accent: preferencesRow?.accent ?? "sky",
      funCardEnabled: Boolean(preferencesRow?.funCardEnabled ?? true),
    },
    providers,
  };
}

function buildTodayTasks(user: ResolvedUser): string[] {
  const tasks: string[] = [];

  if (!user.profile.satTotal) {
    tasks.push("Take a 30-minute SAT diagnostic block and record your score.");
  } else if ((user.profile.satTotal ?? 0) < 1250) {
    tasks.push("Do one focused SAT Math + RW drill set (20 questions each).");
  } else {
    tasks.push("Do one timed mixed SAT section and review all mistakes.");
  }

  if (!user.profile.targetMajor) {
    tasks.push("Shortlist 3 majors you actually want and map them to 5 universities.");
  } else {
    tasks.push(`Refine your ${user.profile.targetMajor} application narrative in 5 bullet points.`);
  }

  if (user.profile.interests.length > 0) {
    tasks.push(`Add one portfolio or extracurricular action tied to: ${user.profile.interests[0]}.`);
  } else {
    tasks.push("Pick one interest area to personalize your study rhythm.");
  }

  return tasks;
}

// Drizzle helper workaround to keep TypeScript happy for nullable deadline filtering.
function deadlinePresent(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

router.post("/link-token", async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "Link token service temporarily unavailable", 503);
    }

    const db = getDb();
    const token = randomBytes(24).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

    await db
      .insert(botLinkTokens)
      .values({
        userId: req.user.id,
        tokenHash,
        expiresAt,
      });

    await db.insert(auditLogs).values({
      userId: req.user.id,
      action: "telegram_bot_link_token_created",
      metadata: JSON.stringify({ expiresAt: expiresAt.toISOString() }),
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });

    const botUsername = normalizeTelegramBotUsername();
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=link_${token}` : null;

    logBot("link-token", requestId, "issued telegram bot link token", {
      userId: req.user.id,
      expiresAt: expiresAt.toISOString(),
      hasBotUsername: Boolean(botUsername),
    });

    return res.json({
      ok: true,
      data: {
        token,
        deepLink,
        botUsername,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/resolve-user", async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    assertInternalBotRequest(req);
    const input = botIdentitySchema.parse(req.body ?? {});

    const user = await resolveUserByTelegramId(input.telegramUserId, requestId);
    if (!user) {
      return res.json({
        ok: true,
        data: {
          linked: false,
          appUrl: getAppOrigin(),
        },
      });
    }

    return res.json({
      ok: true,
      data: {
        linked: true,
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/link-with-token", async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    assertInternalBotRequest(req);
    const input = botLinkWithTokenSchema.parse(req.body ?? {});

    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "Link service temporarily unavailable", 503);
    }

    const db = getDb();
    const tokenHash = hashToken(input.token);
    const now = new Date();

    const tokenRows = await db
      .select()
      .from(botLinkTokens)
      .where(
        and(
          eq(botLinkTokens.tokenHash, tokenHash),
          isNull(botLinkTokens.usedAt),
          gt(botLinkTokens.expiresAt, now),
        ),
      )
      .limit(1);

    const tokenRow = tokenRows[0] ?? null;
    if (!tokenRow) {
      throw new AppError("INVALID_TOKEN", "Token is invalid or expired", 400);
    }

    const existingRows = await db
      .select({ userId: linkedIdentities.userId })
      .from(linkedIdentities)
      .where(
        and(
          eq(linkedIdentities.provider, "telegram"),
          eq(linkedIdentities.providerUserId, input.telegramUserId),
        ),
      )
      .limit(1);

    const alreadyLinkedUserId = existingRows[0]?.userId ?? null;
    if (alreadyLinkedUserId && alreadyLinkedUserId !== tokenRow.userId) {
      throw new AppError("PROVIDER_CONFLICT", "Telegram account already linked to another user", 409);
    }

    const {
      data: { user },
      error: userError,
    } = await getSupabaseAdmin().auth.admin.getUserById(tokenRow.userId);

    if (userError || !user) {
      throw new AppError("AUTH_SERVICE_UNAVAILABLE", "User lookup unavailable", 503);
    }

    const mergedMetadata = {
      ...(user.user_metadata ?? {}),
      telegram_user_id: input.telegramUserId,
      telegram_username: input.telegramUsername ?? null,
    };

    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(tokenRow.userId, {
      user_metadata: mergedMetadata,
    });

    if (updateError) {
      throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Failed to link Telegram", 503);
    }

    await db
      .insert(linkedIdentities)
      .values({
        userId: tokenRow.userId,
        provider: "telegram",
        providerUserId: input.telegramUserId,
      })
      .onConflictDoNothing({
        target: [linkedIdentities.provider, linkedIdentities.providerUserId],
      });

    await db
      .update(botLinkTokens)
      .set({ usedAt: new Date() })
      .where(eq(botLinkTokens.id, tokenRow.id));

    await db.insert(auditLogs).values({
      userId: tokenRow.userId,
      action: "telegram_bot_linked_via_token",
      metadata: JSON.stringify({
        telegramUserId: input.telegramUserId,
        telegramUsername: input.telegramUsername ?? null,
      }),
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? "bot_api",
    });

    const resolved = await resolveUserByTelegramId(input.telegramUserId, requestId);

    return res.json({
      ok: true,
      data: {
        linked: true,
        user: resolved,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/dashboard", async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    assertInternalBotRequest(req);
    const input = botIdentitySchema.parse(req.body ?? {});

    const user = await resolveUserByTelegramId(input.telegramUserId, requestId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "BOT_NOT_LINKED",
          message: "Telegram account is not linked",
        },
      });
    }

    let deadlineItems: Array<{ name: string; deadline: string }> = [];
    if (isDatabaseHealthy()) {
      try {
        const db = getDb();
        const deadlineRows = await db
          .select({ name: universities.name, deadline: universities.applicationDeadline })
          .from(universities)
          .orderBy(asc(universities.name))
          .limit(80);

        deadlineItems = deadlineRows
          .filter((row) => deadlinePresent(row.deadline))
          .slice(0, 5)
          .map((row) => ({ name: row.name, deadline: row.deadline as string }));
      } catch (error) {
        logBot("dashboard", requestId, "deadline lookup failed", {
          error: formatLogError(error),
        });
      }
    }

    const todayTasks = buildTodayTasks(user);

    return res.json({
      ok: true,
      data: {
        linked: true,
        user,
        plan: {
          today: todayTasks,
          tasks: todayTasks,
          deadlines: deadlineItems,
        },
        quickLinks: {
          dashboard: `${getAppOrigin()}/dashboard`,
          account: `${getAppOrigin()}/account`,
          tutor: `${getAppOrigin()}/tutor`,
          onboarding: `${getAppOrigin()}/onboarding`,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/ai", async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    assertInternalBotRequest(req);
    const input = botAiSchema.parse(req.body ?? {});

    if (!checkBotAiRateLimit(input.telegramUserId)) {
      throw new AppError("RATE_LIMIT", "Too many bot AI requests. Please wait a bit.", 429);
    }

    const user = await resolveUserByTelegramId(input.telegramUserId, requestId);
    if (!user) {
      throw new AppError("BOT_NOT_LINKED", "Telegram account is not linked", 401);
    }

    const systemPrompt = [
      "You are Sypev AI inside Telegram bot.",
      "Keep answers short-to-medium, practical, and student-friendly.",
      "Never output robotic fixed templates.",
      "Avoid placeholder greetings like 'Foydalanuvchi Noma\'lum'.",
      "If question is SAT/admissions, provide tactical and concrete steps.",
      "Use clean markdown-like style only when helpful.",
    ].join("\n");

    const userPrompt = [
      `Context: ${input.context}`,
      `User: name=${user.name}, username=${user.username ?? "not_set"}`,
      `Profile: target_major=${user.profile.targetMajor ?? "not_set"}, sat_total=${user.profile.satTotal ?? "not_set"}, interests=${user.profile.interests.join(",") || "not_set"}`,
      `Persona: ${user.preferences.persona}, theme=${user.preferences.theme}`,
      `Question: ${input.message}`,
    ].join("\n\n");

    const response = await sendTutorPrompt({
      systemPrompt,
      userPrompt,
    });

    const reply = normalizeAiReply(response.reply);

    if (isDatabaseHealthy()) {
      try {
        const db = getDb();
        await db.insert(auditLogs).values({
          userId: user.id,
          action: "telegram_bot_ai_request",
          metadata: JSON.stringify({ mode: response.mode, context: input.context }),
          ip: req.ip,
          userAgent: req.headers["user-agent"] ?? "telegram_bot",
        });
      } catch {
        // non-blocking audit log write
      }
    }

    return res.json({
      ok: true,
      data: {
        reply,
        mode: response.mode,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/health", async (req, res, next) => {
  const requestId = ((req as { id?: string }).id ?? "unknown").toString();

  try {
    assertInternalBotRequest(req);

    return res.json({
      ok: true,
      data: {
        database: getDbConfigStatus(),
        supabase: getSupabaseConfigStatus(),
        appUrl: getAppOrigin(),
        botUsername: normalizeTelegramBotUsername(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logBot("health", requestId, "health check failed", {
      error: formatLogError(error),
    });
    return next(error);
  }
});

export default router;
