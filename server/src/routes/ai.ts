import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { studentProfiles, universities, universityFacts } from "../db/schema";
import { parseWithSchema } from "../utils/validation";
import { aiTutorSchema } from "../validators/ai";
import { AppError } from "../utils/error";
import { sendTutorPrompt } from "../services/aiProvider";

const router = Router();
const DISCLAIMER = "AI guidance only.";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;

async function checkRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  const db = getDb();
  const { auditLogs } = await import("../db/schema");
  const { and, eq, gte } = await import("drizzle-orm");

  const recent = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        eq(auditLogs.action, "ai_tutor_request"),
        gte(auditLogs.createdAt, now - WINDOW_MS),
      ),
    )
    .all();

  return recent.length < MAX_REQUESTS;
}

router.post("/tutor", async (req, res, next) => {
  try {
    const input = parseWithSchema(aiTutorSchema, req.body);
    const userId = req.user!.id;

    const limitOk = await checkRateLimit(userId);
    if (!limitOk) {
      throw new AppError(
        "RATE_LIMIT",
        "Too many requests. Please wait and try again.",
        429,
      );
    }

    const db = getDb();
    const profile = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .get();

    let uniContext = "";
    if (input.university_id) {
      const uni = await db
        .select()
        .from(universities)
        .where(eq(universities.id, input.university_id))
        .get();
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

    const prompt = [
      `Context: ${input.context || "General"}`,
      `User SAT: Math ${profile?.satMath ?? "N/A"}, RW ${profile?.satReadingWriting ?? "N/A"}, Total ${profile?.satTotal ?? "N/A"}`,
      uniContext ? uniContext : "",
      `User message: ${input.message}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await sendTutorPrompt(prompt);

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
        reply: response.reply,
        mode: response.mode,
        disclaimer: DISCLAIMER,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
