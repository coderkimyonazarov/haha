import { Router } from "express";
import { getSupabaseAdmin } from "../utils/supabase";
import { AppError } from "../utils/error";
import { getDb, isDatabaseHealthy } from "../db";
import { auditLogs, universities } from "../db/schema";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard-stats", async (req, res, next) => {
  try {
    const { data: { users }, error } = await getSupabaseAdmin().auth.admin.listUsers();
    let auditCountResult = 0;
    let universityCountResult = 0;
    if (isDatabaseHealthy()) {
      const db = getDb();
      [auditCountResult, universityCountResult] = await Promise.all([
        db.$count(auditLogs),
        db.$count(universities)
      ]);
    }
    res.json({
      ok: true,
      data: {
        totalUsers: users?.length || 0,
        activeSessions: 0, // Not trackable natively on Supabase Admin easily
        totalUniversities: universityCountResult,
        recentActivity: auditCountResult,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const { data: { users }, error } = await getSupabaseAdmin().auth.admin.listUsers();
    if (error) throw new AppError("SERVER_ERROR", error.message, 500);

    const mappedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || "User",
      createdAt: new Date(u.created_at).getTime(),
    }));

    res.json({ ok: true, data: { users: mappedUsers } });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    if (!isDatabaseHealthy()) {
      return res.json({ ok: true, data: { logs: [] } });
    }

    const db = getDb();
    const logs = await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);
    res.json({ ok: true, data: { logs } });
  } catch (error) {
    next(error);
  }
});

// Mock operations for admin panel testing
router.post("/users/:id/ban", (req, res) => res.json({ ok: true }));
router.post("/users/:id/unban", (req, res) => res.json({ ok: true }));
router.delete("/users/:id", (req, res) => res.json({ ok: true }));
router.post("/users/:id/verify", (req, res) => res.json({ ok: true }));

export default router;
