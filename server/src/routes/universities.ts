import { Router } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb, isDatabaseHealthy } from "../db";
import { universities, universityFacts } from "../db/schema";
import { parseWithSchema, sanitizeText } from "../utils/validation";
import { universityListQuerySchema, universityIdParamSchema, factCreateSchema } from "../validators/universities";
import { AppError } from "../utils/error";

const router = Router();

function getDbOrNull() {
  if (!isDatabaseHealthy()) {
    return null;
  }

  try {
    return getDb();
  } catch {
    return null;
  }
}

router.get("/", async (req, res, next) => {
  try {
    const query = parseWithSchema(universityListQuerySchema, req.query);
    const db = getDbOrNull();
    if (!db) {
      return res.json({ ok: true, data: [] });
    }
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const whereClauses = [] as Array<ReturnType<typeof sql>>;
    if (query.search) {
      const term = `%${query.search.toLowerCase()}%`;
      whereClauses.push(sql`lower(${universities.name}) like ${term}`);
    }
    if (query.state) {
      whereClauses.push(eq(universities.state, query.state));
    }

    const where = whereClauses.length ? and(...whereClauses) : undefined;

    const list = await db
      .select()
      .from(universities)
      .where(where)
      .orderBy(asc(universities.name))
      .limit(limit)
      .offset(offset);

    res.json({ ok: true, data: list });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const params = parseWithSchema(universityIdParamSchema, req.params);
    const db = getDbOrNull();
    if (!db) {
      throw new AppError("DATABASE_UNAVAILABLE", "University service temporarily unavailable", 503);
    }
    const uniRows = await db.select().from(universities).where(eq(universities.id, params.id)).limit(1);
    const uni = uniRows[0] ?? null;
    if (!uni) {
      throw new AppError("NOT_FOUND", "University not found", 404);
    }
    const facts = await db
      .select()
      .from(universityFacts)
      .where(eq(universityFacts.universityId, params.id))
      .orderBy(desc(universityFacts.createdAt));

    res.json({ ok: true, data: { ...uni, facts } });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/facts", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }
    const params = parseWithSchema(universityIdParamSchema, req.params);
    const input = parseWithSchema(factCreateSchema, req.body);
    const db = getDbOrNull();
    if (!db) {
      throw new AppError("DATABASE_UNAVAILABLE", "University service temporarily unavailable", 503);
    }

    const uniRows = await db.select().from(universities).where(eq(universities.id, params.id)).limit(1);
    const uni = uniRows[0] ?? null;
    if (!uni) {
      throw new AppError("NOT_FOUND", "University not found", 404);
    }

    const now = Date.now();
    const factId = randomUUID();
    const factText = sanitizeText(input.fact_text);
    const sourceUrl = sanitizeText(input.source_url);

    await db.insert(universityFacts).values({
      id: factId,
      universityId: params.id,
      factText,
      sourceUrl,
      tag: input.tag ? sanitizeText(input.tag) : null,
      year: input.year ?? null,
      createdAt: now,
      isVerified: 0
    });

    const createdRows = await db
      .select()
      .from(universityFacts)
      .where(eq(universityFacts.id, factId))
      .limit(1);
    const created = createdRows[0] ?? null;
    res.json({ ok: true, data: created });
  } catch (error) {
    next(error);
  }
});

export default router;
