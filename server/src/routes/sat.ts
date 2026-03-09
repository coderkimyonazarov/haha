import { Router } from "express";
import { getDb, isDatabaseHealthy } from "../db";
import { satTopics } from "../db/schema";

const router = Router();

router.get("/topics", async (_req, res, next) => {
  try {
    if (!isDatabaseHealthy()) {
      return res.json({ ok: true, data: [] });
    }

    const db = getDb();
    const topics = await db.select().from(satTopics);
    res.json({ ok: true, data: topics });
  } catch (error) {
    next(error);
  }
});

export default router;
