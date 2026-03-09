import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseHealthy } from "../db";
import { studentProfiles } from "../db/schema";
import { profileUpdateSchema } from "../validators/profile";
import { parseWithSchema, sanitizeText } from "../utils/validation";
import { AppError } from "../utils/error";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!isDatabaseHealthy()) {
      return res.json({
        ok: true,
        data: {
          userId: req.user.id,
          grade: null,
          country: "Uzbekistan",
          targetMajor: null,
          satMath: null,
          satReadingWriting: null,
          satTotal: null,
          ieltsScore: null,
        },
      });
    }

    const db = getDb();
    const profileRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);
    const profile = profileRows[0] ?? null;
    res.json({ ok: true, data: profile });
  } catch (error) {
    next(error);
  }
});

router.put("/", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "Profile service temporarily unavailable", 503);
    }

    const input = parseWithSchema(profileUpdateSchema, req.body);
    const db = getDb();
    const currentRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);
    const current = currentRows[0] ?? null;

    const nextValues = {
      grade: input.grade ?? current?.grade ?? null,
      country: input.country !== undefined && input.country !== null ? sanitizeText(input.country) : current?.country || "Uzbekistan",
      targetMajor:
        input.target_major !== undefined && input.target_major !== null ? sanitizeText(input.target_major) : current?.targetMajor || null,
      satMath: input.sat_math ?? current?.satMath ?? null,
      satReadingWriting: input.sat_reading_writing ?? current?.satReadingWriting ?? null,
      ieltsScore: input.ielts_score ?? current?.ieltsScore ?? null
    };

    const satMath = nextValues.satMath;
    const satReadingWriting = nextValues.satReadingWriting;
    const hasBothSat = typeof satMath === "number" && typeof satReadingWriting === "number";
    const satTotal = hasBothSat ? satMath + satReadingWriting : null;

    await db
      .update(studentProfiles)
      .set({
        grade: nextValues.grade,
        country: nextValues.country,
        targetMajor: nextValues.targetMajor,
        satMath: nextValues.satMath,
        satReadingWriting: nextValues.satReadingWriting,
        satTotal,
        ieltsScore: nextValues.ieltsScore,
        updatedAt: new Date()
      })
      .where(eq(studentProfiles.userId, req.user.id));

    const updatedRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);
    const updated = updatedRows[0] ?? null;

    res.json({ ok: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
