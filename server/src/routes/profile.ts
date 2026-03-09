import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseHealthy } from "../db";
import { studentProfiles, userPreferences } from "../db/schema";
import {
  onboardingSaveSchema,
  personalizationUpdateSchema,
  profileUpdateSchema,
} from "../validators/profile";
import { parseWithSchema, sanitizeText } from "../utils/validation";
import { AppError } from "../utils/error";
import { getSupabaseAdmin } from "../utils/supabase";

const router = Router();

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

function mapPersonaToVibe(persona: string): "minimal" | "playful" | "bold" {
  if (persona === "bold_dark") {
    return "bold";
  }
  if (persona === "soft_cute" || persona === "energetic_fun") {
    return "playful";
  }
  return "minimal";
}

function normalizeProfileRow(row: any | null) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    interests: parseInterests(row.interestsJson),
  };
}

async function ensureUserProfileRow(userId: string) {
  const db = getDb();
  await db
    .insert(studentProfiles)
    .values({
      userId,
    })
    .onConflictDoNothing({ target: studentProfiles.userId });
}

async function ensureUserPreferencesRow(userId: string) {
  const db = getDb();
  await db
    .insert(userPreferences)
    .values({
      userId,
      theme: "system",
      accent: "sky",
      vibe: "minimal",
      persona: "clean_minimal",
      onboardingDone: false,
      funCardEnabled: true,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: userPreferences.userId });
}

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
          firstName: null,
          lastName: null,
          gender: null,
          birthYear: null,
          interests: [],
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
    await ensureUserProfileRow(req.user.id);
    const profileRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);
    const profile =
      normalizeProfileRow(profileRows[0] ?? null) ??
      ({
        userId: req.user.id,
        firstName: null,
        lastName: null,
        gender: null,
        birthYear: null,
        interests: [],
        grade: null,
        country: "Uzbekistan",
        targetMajor: null,
        satMath: null,
        satReadingWriting: null,
        satTotal: null,
        ieltsScore: null,
      } as const);
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
    await ensureUserProfileRow(req.user.id);

    const currentRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);
    const current = currentRows[0] ?? null;

    const nextValues = {
      grade: input.grade ?? current?.grade ?? null,
      country:
        input.country !== undefined && input.country !== null
          ? sanitizeText(input.country)
          : current?.country || "Uzbekistan",
      targetMajor:
        input.target_major !== undefined && input.target_major !== null
          ? sanitizeText(input.target_major)
          : current?.targetMajor || null,
      satMath: input.sat_math ?? current?.satMath ?? null,
      satReadingWriting: input.sat_reading_writing ?? current?.satReadingWriting ?? null,
      ieltsScore: input.ielts_score ?? current?.ieltsScore ?? null,
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
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.userId, req.user.id));

    const updatedRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);
    const updated = normalizeProfileRow(updatedRows[0] ?? null);

    res.json({ ok: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.get("/onboarding", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "Onboarding service temporarily unavailable", 503);
    }

    const db = getDb();
    await ensureUserProfileRow(req.user.id);
    await ensureUserPreferencesRow(req.user.id);

    const [profileRows, preferenceRows] = await Promise.all([
      db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, req.user.id))
        .limit(1),
      db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, req.user.id))
        .limit(1),
    ]);

    const profile = normalizeProfileRow(profileRows[0] ?? null);
    const preferences = preferenceRows[0] ?? null;

    res.json({
      ok: true,
      data: {
        first_name: profile?.firstName ?? "",
        last_name: profile?.lastName ?? "",
        gender: profile?.gender ?? "prefer_not_to_say",
        birth_year: profile?.birthYear ?? 2007,
        interests: profile?.interests ?? [],
        persona: preferences?.persona ?? "clean_minimal",
        theme: preferences?.theme ?? "system",
        accent: preferences?.accent ?? "sky",
        onboarding_done: Boolean(preferences?.onboardingDone ?? false),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/onboarding", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "Onboarding service temporarily unavailable", 503);
    }

    const input = parseWithSchema(onboardingSaveSchema, req.body);
    const db = getDb();
    await ensureUserProfileRow(req.user.id);
    await ensureUserPreferencesRow(req.user.id);

    const interestsJson = JSON.stringify(input.interests);
    const persona = input.persona;
    const vibe = mapPersonaToVibe(persona);

    await db
      .update(studentProfiles)
      .set({
        firstName: input.first_name,
        lastName: input.last_name,
        gender: input.gender,
        birthYear: input.birth_year,
        interestsJson,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.userId, req.user.id));

    await db
      .update(userPreferences)
      .set({
        theme: input.theme,
        accent: input.accent ?? "sky",
        persona,
        vibe,
        onboardingDone: true,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, req.user.id));

    const supabaseName = `${input.first_name} ${input.last_name}`.trim();
    const mergedMetadata = {
      ...(req.user.user_metadata ?? {}),
      name: supabaseName,
      first_name: input.first_name,
      last_name: input.last_name,
      gender: input.gender,
      interests: input.interests,
      persona,
    };

    await getSupabaseAdmin().auth.admin.updateUserById(req.user.id, {
      user_metadata: mergedMetadata,
    });

    const [profileRows, preferenceRows] = await Promise.all([
      db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, req.user.id))
        .limit(1),
      db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, req.user.id))
        .limit(1),
    ]);

    res.json({
      ok: true,
      data: {
        profile: normalizeProfileRow(profileRows[0] ?? null),
        preferences: preferenceRows[0] ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/personalization", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!isDatabaseHealthy()) {
      throw new AppError("DATABASE_UNAVAILABLE", "Personalization service temporarily unavailable", 503);
    }

    const input = parseWithSchema(personalizationUpdateSchema, req.body);
    const db = getDb();
    await ensureUserProfileRow(req.user.id);
    await ensureUserPreferencesRow(req.user.id);

    if (input.interests) {
      await db
        .update(studentProfiles)
        .set({
          interestsJson: JSON.stringify(input.interests),
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.userId, req.user.id));
    }

    if (
      input.persona !== undefined ||
      input.theme !== undefined ||
      input.accent !== undefined ||
      input.vibe !== undefined ||
      input.fun_card_enabled !== undefined
    ) {
      const currentRows = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, req.user.id))
        .limit(1);
      const current = currentRows[0] ?? null;
      const nextPersona = input.persona ?? current?.persona ?? "clean_minimal";

      await db
        .update(userPreferences)
        .set({
          persona: nextPersona,
          theme: input.theme ?? current?.theme ?? "system",
          accent: input.accent ?? current?.accent ?? "sky",
          vibe: input.vibe ?? mapPersonaToVibe(nextPersona),
          funCardEnabled: input.fun_card_enabled ?? current?.funCardEnabled ?? true,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, req.user.id));
    }

    const [profileRows, preferencesRows] = await Promise.all([
      db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, req.user.id))
        .limit(1),
      db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, req.user.id))
        .limit(1),
    ]);

    res.json({
      ok: true,
      data: {
        profile: normalizeProfileRow(profileRows[0] ?? null),
        preferences: preferencesRows[0] ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
