import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb, isDatabaseHealthy } from "../db";
import {
  auditLogs,
  linkedIdentities,
  studentProfiles,
  universities,
} from "../db/schema";
import { sendTutorPrompt } from "../services/aiProvider";
import { AppError } from "../utils/error";
import { getSupabaseAdmin, getSupabaseConfigStatus } from "../utils/supabase";

const router = Router();

const addUniversitySchema = z.object({
  name: z.string().min(1).max(180),
  state: z.string().min(1).max(120),
  tuitionUsd: z.number().int().positive().optional(),
  aidPolicy: z.string().max(120).optional(),
  satRangeMin: z.number().int().min(200).max(1600).optional(),
  satRangeMax: z.number().int().min(200).max(1600).optional(),
  englishReq: z.string().max(120).optional(),
  applicationDeadline: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
});

type AuditLevel = "info" | "warn" | "error";

function parsePositiveInt(raw: unknown, fallback: number, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(value), max);
}

function toEpoch(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string" || typeof value === "number") {
    const ts = new Date(value).getTime();
    if (Number.isFinite(ts)) {
      return ts;
    }
  }
  return Date.now();
}

function parseMetadata(raw: unknown): unknown {
  if (typeof raw !== "string") {
    return raw ?? null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function getAuditLevel(action: string, metadata: unknown): AuditLevel {
  const lowerAction = action.toLowerCase();
  const message =
    typeof metadata === "object" && metadata && "message" in metadata
      ? String((metadata as Record<string, unknown>).message ?? "")
      : "";
  const lowerMessage = message.toLowerCase();

  if (
    lowerAction.includes("error") ||
    lowerAction.includes("failed") ||
    lowerMessage.includes("error") ||
    lowerMessage.includes("failed")
  ) {
    return "error";
  }
  if (lowerAction.includes("warn") || lowerMessage.includes("warn")) {
    return "warn";
  }
  return "info";
}

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

async function writeAudit(req: any, action: string, metadata?: Record<string, unknown>) {
  if (!isDatabaseHealthy()) {
    return;
  }
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      userId: null,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });
  } catch {
    // keep admin APIs non-blocking if audit write fails
  }
}

async function loadRecentAudit(limit = 200) {
  if (!isDatabaseHealthy()) {
    return [] as Array<{
      id: string;
      userId: string | null;
      action: string;
      metadata: unknown;
      ip: string | null;
      userAgent: string | null;
      createdAt: number;
      level: AuditLevel;
    }>;
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row) => {
    const metadata = parseMetadata(row.metadata);
    return {
      id: row.id,
      userId: row.userId ?? null,
      action: row.action,
      metadata,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      createdAt: toEpoch(row.createdAt),
      level: getAuditLevel(row.action, metadata),
    };
  });
}

async function getStatsPayload() {
  const {
    data: { users },
    error,
  } = await getSupabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new AppError("SERVER_ERROR", error.message, 500);
  }

  let universityCount = 0;
  let recentActivity = 0;
  let recentErrors = 0;
  if (isDatabaseHealthy()) {
    const db = getDb();
    universityCount = await db.$count(universities);
    recentActivity = await db.$count(auditLogs);
    const recent = await loadRecentAudit(200);
    recentErrors = recent.filter((item) => item.level === "error").length;
  }

  return {
    users: users?.length || 0,
    universities: universityCount,
    activeSessions: 0,
    recentActivity,
    recentErrors,
    dbHealthy: isDatabaseHealthy(),
    supabase: getSupabaseConfigStatus(),
  };
}

router.get("/stats", async (_req, res, next) => {
  try {
    const data = await getStatsPayload();
    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
});

router.get("/dashboard-stats", async (_req, res, next) => {
  try {
    const data = await getStatsPayload();
    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const search = (typeof req.query.search === "string" ? req.query.search : "")
      .trim()
      .toLowerCase();
    const limit = parsePositiveInt(req.query.limit, 100, 500);
    const offset = parsePositiveInt(req.query.offset, 0, 5000);

    const {
      data: { users },
      error,
    } = await getSupabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      throw new AppError("SERVER_ERROR", error.message, 500);
    }

    const mappedUsers = (users ?? []).map((u) => {
      const providers =
        u.identities?.map((identity) => identity.provider).filter(Boolean) ?? [];
      const metadata = (u.user_metadata ?? {}) as Record<string, unknown>;
      const isAdminMeta =
        metadata.isAdmin === true ||
        metadata.is_admin === true ||
        metadata.role === "admin";

      return {
        id: u.id,
        email: u.email ?? null,
        name: String(metadata.name ?? "User"),
        isAdmin: isAdminMeta ? 1 : 0,
        createdAt: toEpoch(u.created_at),
        lastSignInAt: u.last_sign_in_at ? toEpoch(u.last_sign_in_at) : null,
        providers,
      };
    });

    const filtered = mappedUsers.filter((u) => {
      if (!search) {
        return true;
      }
      return (
        u.name.toLowerCase().includes(search) ||
        (u.email ?? "").toLowerCase().includes(search)
      );
    });

    const sliced = filtered.slice(offset, offset + limit);
    return res.json({
      ok: true,
      data: sliced,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/users/:id/toggle-admin", async (req, res, next) => {
  try {
    const userId = String(req.params.id ?? "").trim();
    if (!userId) {
      throw new AppError("INVALID_INPUT", "Missing user id", 400);
    }

    const {
      data: { user },
      error: getError,
    } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    if (getError || !user) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const currentIsAdmin =
      metadata.isAdmin === true ||
      metadata.is_admin === true ||
      metadata.role === "admin";
    const nextIsAdmin = !currentIsAdmin;

    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      isAdmin: nextIsAdmin,
      is_admin: nextIsAdmin,
      role: nextIsAdmin ? "admin" : "user",
    };

    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
      user_metadata: nextMetadata,
    });
    if (updateError) {
      throw new AppError("SERVER_ERROR", updateError.message, 500);
    }

    await writeAudit(req, "admin_toggle", {
      targetUserId: userId,
      isAdmin: nextIsAdmin,
    });

    return res.json({
      ok: true,
      data: { id: userId, isAdmin: nextIsAdmin ? 1 : 0 },
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const userId = String(req.params.id ?? "").trim();
    if (!userId) {
      throw new AppError("INVALID_INPUT", "Missing user id", 400);
    }

    if (isDatabaseHealthy()) {
      const db = getDb();
      await db.delete(linkedIdentities).where(eq(linkedIdentities.userId, userId));
      await db.delete(studentProfiles).where(eq(studentProfiles.userId, userId));
    }

    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
    if (error) {
      throw new AppError("SERVER_ERROR", error.message, 500);
    }

    await writeAudit(req, "admin_user_deleted", { targetUserId: userId });

    return res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    return next(error);
  }
});

router.get("/universities", async (_req, res, next) => {
  try {
    if (!isDatabaseHealthy()) {
      return res.json({ ok: true, data: [] });
    }

    const db = getDb();
    const list = await db.select().from(universities).orderBy(desc(universities.name));
    return res.json({ ok: true, data: list });
  } catch (error) {
    return next(error);
  }
});

router.post("/universities", async (req, res, next) => {
  try {
    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "University service unavailable", 503);
    }

    const parsed = addUniversitySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", "Invalid university payload", 400);
    }

    const input = parsed.data;
    if (
      typeof input.satRangeMin === "number" &&
      typeof input.satRangeMax === "number" &&
      input.satRangeMin > input.satRangeMax
    ) {
      throw new AppError("INVALID_INPUT", "SAT minimum cannot exceed SAT maximum", 400);
    }

    const db = getDb();
    const id = randomUUID();
    await db.insert(universities).values({
      id,
      name: input.name.trim(),
      state: input.state.trim(),
      tuitionUsd: input.tuitionUsd ?? null,
      aidPolicy: input.aidPolicy?.trim() || null,
      satRangeMin: input.satRangeMin ?? null,
      satRangeMax: input.satRangeMax ?? null,
      englishReq: input.englishReq?.trim() || null,
      applicationDeadline: input.applicationDeadline?.trim() || null,
      description: input.description?.trim() || null,
    });

    const row = await db.select().from(universities).where(eq(universities.id, id)).limit(1);
    await writeAudit(req, "admin_university_created", { universityId: id, name: input.name });
    return res.json({ ok: true, data: row[0] ?? null });
  } catch (error) {
    return next(error);
  }
});

router.delete("/universities/:id", async (req, res, next) => {
  try {
    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "University service unavailable", 503);
    }

    const id = String(req.params.id ?? "").trim();
    if (!id) {
      throw new AppError("INVALID_INPUT", "Missing university id", 400);
    }

    const db = getDb();
    await db.delete(universities).where(eq(universities.id, id));
    await writeAudit(req, "admin_university_deleted", { universityId: id });
    return res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    return next(error);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 200, 1000);
    const logs = await loadRecentAudit(limit);
    return res.json({ ok: true, data: logs });
  } catch (error) {
    return next(error);
  }
});

router.get("/events", async (req, res, next) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 200, 1000);
    const logs = await loadRecentAudit(limit);
    const events = logs.map((item) => ({
      id: item.id,
      type: item.action,
      level: item.level,
      createdAt: item.createdAt,
      userId: item.userId,
      details: item.metadata,
    }));
    return res.json({ ok: true, data: events });
  } catch (error) {
    return next(error);
  }
});

router.get("/errors", async (req, res, next) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 200, 1000);
    const logs = await loadRecentAudit(limit);
    const errors = logs
      .filter((item) => item.level === "error")
      .map((item) => ({
        id: item.id,
        code:
          typeof item.metadata === "object" &&
          item.metadata &&
          "code" in item.metadata
            ? String((item.metadata as Record<string, unknown>).code)
            : "UNKNOWN",
        message:
          typeof item.metadata === "object" &&
          item.metadata &&
          "message" in item.metadata
            ? String((item.metadata as Record<string, unknown>).message)
            : item.action,
        createdAt: item.createdAt,
        details: item.metadata,
        fixHint:
          "Check recent deployment/env changes and inspect server route handling for this action.",
      }));

    return res.json({ ok: true, data: errors });
  } catch (error) {
    return next(error);
  }
});

router.get("/ai-insights", async (_req, res, next) => {
  try {
    const stats = await getStatsPayload();
    const events = await loadRecentAudit(30);
    const latestErrors = events.filter((e) => e.level === "error").slice(0, 6);

    const prompt = [
      "You are an admin product analyst for Sypev.",
      "Generate concise Uzbek recommendations for the team.",
      "Need exactly 3 sections: (1) new features, (2) detected risks/errors and fixes, (3) next 24h action plan.",
      `Stats: users=${stats.users}, universities=${stats.universities}, recentActivity=${stats.recentActivity}, recentErrors=${stats.recentErrors}.`,
      `Recent events: ${JSON.stringify(events.slice(0, 10))}`,
      `Recent errors: ${JSON.stringify(latestErrors)}`,
      "Respond in plain text with bullet lines only.",
    ].join("\n");

    const ai = await sendTutorPrompt(prompt);
    return res.json({
      ok: true,
      data: {
        generatedAt: Date.now(),
        mode: ai.mode,
        summary: ai.reply,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/users/:id/ban", (_req, res) => res.json({ ok: true, data: { ok: true } }));
router.post("/users/:id/unban", (_req, res) => res.json({ ok: true, data: { ok: true } }));
router.post("/users/:id/verify", (_req, res) => res.json({ ok: true, data: { ok: true } }));

export default router;
