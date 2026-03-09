import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseHealthy } from "../db";
import { studentProfiles, universities } from "../db/schema";
import { parseWithSchema } from "../utils/validation";
import { admissionsRecommendSchema } from "../validators/admissions";
import { AppError } from "../utils/error";

const router = Router();

const DISCLAIMER = "Estimate only. Not a guarantee.";

router.post("/recommend", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = parseWithSchema(admissionsRecommendSchema, req.body ?? {});
    if (!isDatabaseHealthy()) {
      return res.json({
        ok: true,
        data: {
          safety: [],
          target: [],
          reach: [],
          disclaimer: DISCLAIMER,
          message: "Recommendation service temporarily unavailable."
        }
      });
    }

    const db = getDb();
    const profileRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);
    const profile = profileRows[0] ?? null;

    if (profile?.satTotal === null || profile?.satTotal === undefined) {
      return res.json({
        ok: true,
        data: {
          safety: [],
          target: [],
          reach: [],
          disclaimer: DISCLAIMER,
          message: "Add a SAT diagnostic score to get recommendations."
        }
      });
    }

    let list = await db.select().from(universities);

    if (input.preferences?.state) {
      list = list.filter((u) => u.state === input.preferences!.state);
    }
    if (input.preferences?.max_tuition !== undefined) {
      list = list.filter((u) => (u.tuitionUsd ?? Number.MAX_SAFE_INTEGER) <= input.preferences!.max_tuition!);
    }

    const safety = [] as typeof list;
    const target = [] as typeof list;
    const reach = [] as typeof list;

    for (const uni of list) {
      if (uni.satRangeMin === null || uni.satRangeMax === null) {
        target.push(uni);
        continue;
      }
      if (profile.satTotal >= uni.satRangeMax) {
        safety.push(uni);
      } else if (profile.satTotal >= uni.satRangeMin) {
        target.push(uni);
      } else {
        reach.push(uni);
      }
    }

    res.json({ ok: true, data: { safety, target, reach, disclaimer: DISCLAIMER } });
  } catch (error) {
    next(error);
  }
});

export default router;
