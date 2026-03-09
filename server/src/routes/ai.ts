import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { getDb, isDatabaseHealthy } from "../db";
import {
  auditLogs,
  satAttempts,
  studentProfiles,
  userPreferences,
  universities,
  universityFacts,
} from "../db/schema";
import { parseWithSchema } from "../utils/validation";
import { aiTutorSchema } from "../validators/ai";
import { AppError } from "../utils/error";
import { sendTutorPrompt } from "../services/aiProvider";

const router = Router();
const DISCLAIMER = "AI guidance only.";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;

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
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function cleanValue(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeAiReply(raw: string): string {
  let next = raw.trim();

  next = next.replace(/^\s*(salom|assalomu alaykum)\s+foydalanuvchi\s+noma'?lum[!,. ]*/i, "");
  next = next.replace(
    /^\s*\d+\.\s*(main answer|website improvement idea|possible risk\/error)[^\n]*\n?/gim,
    "",
  );
  next = next.replace(/\n{3,}/g, "\n\n").trim();

  return next;
}

async function checkRateLimit(userId: string): Promise<boolean> {
  if (!isDatabaseHealthy()) {
    return true;
  }

  const now = Date.now();
  const db = getDb();
  const { gte } = await import("drizzle-orm");

  const recent = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        eq(auditLogs.action, "ai_tutor_request"),
        gte(auditLogs.createdAt, new Date(now - WINDOW_MS)),
      ),
    );

  return recent.length < MAX_REQUESTS;
}

router.post("/tutor", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = parseWithSchema(aiTutorSchema, req.body);
    const userId = req.user.id;

    const limitOk = await checkRateLimit(userId);
    if (!limitOk) {
      throw new AppError(
        "RATE_LIMIT",
        "Too many requests. Please wait and try again.",
        429,
      );
    }

    const db = isDatabaseHealthy() ? getDb() : null;
    const profileRows = db
      ? await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, userId))
          .limit(1)
      : [];
    const profile = profileRows[0] ?? null;
    const preferencesRows = db
      ? await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, userId))
          .limit(1)
      : [];
    const preferences = preferencesRows[0] ?? null;

    let satAttemptCount = 0;
    let aiRequestCount = 0;
    if (db) {
      const satRows = await db
        .select({ id: satAttempts.id })
        .from(satAttempts)
        .where(eq(satAttempts.userId, userId))
        .limit(3000);
      satAttemptCount = satRows.length;

      const aiRows = await db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, userId),
            eq(auditLogs.action, "ai_tutor_request"),
          ),
        )
        .limit(3000);
      aiRequestCount = aiRows.length;
    }

    const meta = (req.user.user_metadata ?? {}) as Record<string, unknown>;
    const firstName =
      cleanValue(profile?.firstName) ||
      cleanValue(meta.first_name) ||
      cleanValue(meta.given_name) ||
      "";
    const lastName =
      cleanValue(profile?.lastName) || cleanValue(meta.last_name) || cleanValue(meta.family_name) || "";
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ").trim() || cleanValue(meta.name) || "";
    const interests = parseInterests(profile?.interestsJson);
    const interestSummary = interests.length > 0 ? interests.join(", ") : "not specified";
    const persona = cleanValue(preferences?.persona) || "clean_minimal";

    let uniContext = "";
    if (db && input.university_id) {
      const uniRows = await db
        .select()
        .from(universities)
        .where(eq(universities.id, input.university_id))
        .limit(1);
      const uni = uniRows[0] ?? null;
      if (uni) {
        const facts = await db
          .select()
          .from(universityFacts)
          .where(eq(universityFacts.universityId, uni.id));
        const factLines = facts
          .map((fact) => `- ${fact.factText} (Source: ${fact.sourceUrl})`)
          .join("\n");
        uniContext = `University: ${uni.name}\nFacts:\n${factLines}`;
      }
    }

    const systemPrompt = [
      "You are Sypev AI, a practical and friendly study assistant for SAT and admissions.",
      "Answer naturally in the user's language; if unclear, use Uzbek Latin.",
      "Do not use robotic numbered templates unless user explicitly asks for list format.",
      "Do not add website improvement/risk sections unless user directly asks.",
      "If name is unknown, avoid fake placeholders like 'Foydalanuvchi Noma'lum'.",
      "Keep answers short-to-medium, concrete, and student-friendly.",
      "If context is SAT, give tactical practice advice.",
      "If context is Admissions, give realistic application guidance.",
    ].join("\n");

    const userPrompt = [
      `Context: ${input.context || "General"}`,
      `User: full_name=${fullName || "not set"}, email=${req.user.email ?? "not set"}`,
      `Profile: country=${profile?.country ?? "N/A"}, grade=${profile?.grade ?? "N/A"}, target_major=${profile?.targetMajor ?? "N/A"}`,
      `SAT: math=${profile?.satMath ?? "N/A"}, rw=${profile?.satReadingWriting ?? "N/A"}, total=${profile?.satTotal ?? "N/A"}, attempts=${satAttemptCount}`,
      `Interests: ${interestSummary}`,
      `Persona: ${persona}`,
      `AI request count: ${aiRequestCount}`,
      uniContext ? uniContext : "",
      `User question: ${input.message}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await sendTutorPrompt({
      systemPrompt,
      userPrompt,
    });
    const normalizedReply = normalizeAiReply(response.reply);

    const { logAudit } = await import("../services/authService");
    await logAudit({
      userId,
      action: "ai_tutor_request",
      metadata: { context: input.context, provider: response.mode },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      ok: true,
      data: {
        reply: normalizedReply,
        mode: response.mode,
        disclaimer: DISCLAIMER,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
