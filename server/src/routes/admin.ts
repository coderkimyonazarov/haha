import { Router } from "express";
import { randomUUID } from "crypto";
import { eq, count } from "drizzle-orm";
import { getDb } from "../db";
import { users, universities, sessions } from "../db/schema";
import { AppError } from "../utils/error";

const router = Router();

// GET /api/admin/stats
router.get("/stats", async (_req, res, next) => {
  try {
    const db = getDb();
    const [userCount] = await db.select({ count: count() }).from(users);
    const [uniCount] = await db.select({ count: count() }).from(universities);
    const [sessionCount] = await db.select({ count: count() }).from(sessions);
    res.json({
      ok: true,
      data: {
        users: userCount.count,
        universities: uniCount.count,
        activeSessions: sessionCount.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users
router.get("/users", async (req, res, next) => {
  try {
    const db = getDb();
    const search = (req.query.search as string) || "";
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .limit(limit)
      .offset(offset);

    const filtered = search
      ? allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            (u.email && u.email.toLowerCase().includes(search.toLowerCase())),
        )
      : allUsers;

    res.json({ ok: true, data: filtered });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    // Prevent deleting self
    if (req.user && req.user.id === id) {
      throw new AppError("FORBIDDEN", "Cannot delete your own account", 403);
    }
    await db.delete(users).where(eq(users.id, id));
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/users/:id/toggle-admin
router.patch("/users/:id/toggle-admin", async (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const user = await db.select().from(users).where(eq(users.id, id)).get();
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    const newAdmin = user.isAdmin === 1 ? 0 : 1;
    await db.update(users).set({ isAdmin: newAdmin }).where(eq(users.id, id));
    res.json({ ok: true, data: { id, isAdmin: newAdmin } });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/universities
router.get("/universities", async (_req, res, next) => {
  try {
    const db = getDb();
    const list = await db.select().from(universities).limit(200);
    res.json({ ok: true, data: list });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/universities
router.post("/universities", async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body as {
      name: string;
      state: string;
      tuitionUsd?: number;
      aidPolicy?: string;
      satRangeMin?: number;
      satRangeMax?: number;
      englishReq?: string;
      applicationDeadline?: string;
      description?: string;
    };
    if (!body.name || !body.state) {
      throw new AppError(
        "VALIDATION_ERROR",
        "name and state are required",
        400,
      );
    }
    const id = randomUUID();
    await db.insert(universities).values({
      id,
      name: body.name,
      state: body.state,
      tuitionUsd: body.tuitionUsd ?? null,
      aidPolicy: body.aidPolicy ?? null,
      satRangeMin: body.satRangeMin ?? null,
      satRangeMax: body.satRangeMax ?? null,
      englishReq: body.englishReq ?? null,
      applicationDeadline: body.applicationDeadline ?? null,
      description: body.description ?? null,
    });
    const created = await db
      .select()
      .from(universities)
      .where(eq(universities.id, id))
      .get();
    res.status(201).json({ ok: true, data: created });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/universities/:id
router.delete("/universities/:id", async (req, res, next) => {
  try {
    const db = getDb();
    await db.delete(universities).where(eq(universities.id, req.params.id));
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
