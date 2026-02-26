import { Router } from "express";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, studentProfiles, sessions } from "../db/schema";
import { registerSchema, loginSchema } from "../validators/auth";
import { parseWithSchema } from "../utils/validation";
import { AppError } from "../utils/error";
import { getSessionCookieName } from "../middleware/auth";

// ── Admin session helpers ──────────────────────────────────────────────────────
const ADMIN_COOKIE = "sypev_admin";

function getAdminSecret() {
  return process.env.ADMIN_SECRET || "sypev_admin_secret_change_me";
}

function signAdminToken(payload: string): string {
  const sig = createHmac("sha256", getAdminSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): boolean {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const expected = Buffer.from(
    createHmac("sha256", getAdminSecret()).update(payload).digest("hex"),
  );
  try {
    const provided = Buffer.from(token.slice(lastDot + 1));
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: "/",
  };
}

const router = Router();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

async function createSession(userId: string) {
  const db = getDb();
  const sessionId = randomUUID();
  const now = Date.now();
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  return sessionId;
}

router.post("/register", async (req, res, next) => {
  try {
    const input = parseWithSchema(registerSchema, req.body);
    const email = input.email.toLowerCase();
    const db = getDb();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();
    if (existing) {
      throw new AppError("EMAIL_TAKEN", "Email already registered", 409);
    }

    const passwordHash = await argon2.hash(input.password);
    const userId = randomUUID();
    const now = Date.now();

    await db.insert(users).values({
      id: userId,
      email,
      telegramId: null,
      name: input.name || "Student",
      passwordHash,
      createdAt: now,
    });

    await db.insert(studentProfiles).values({
      userId,
      grade: null,
      country: "Uzbekistan",
      targetMajor: null,
      satMath: null,
      satReadingWriting: null,
      satTotal: null,
      ieltsScore: null,
      updatedAt: now,
    });

    const sessionId = await createSession(userId);
    res.cookie(getSessionCookieName(), sessionId, cookieOptions());
    res.json({
      ok: true,
      data: { id: userId, email, name: input.name || "Student" },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = parseWithSchema(loginSchema, req.body);
    const email = input.email.toLowerCase();
    const db = getDb();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();
    if (!user) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }
    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }
    const sessionId = await createSession(user.id);
    res.cookie(getSessionCookieName(), sessionId, cookieOptions());
    res.json({
      ok: true,
      data: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const db = getDb();
    const sessionId = req.cookies?.[getSessionCookieName()];
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    res.clearCookie(getSessionCookieName(), { path: "/" });
    res.json({ ok: true, data: { loggedOut: true } });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ ok: true, data: { user: null, profile: null } });
    }
    const db = getDb();
    const profile = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .get();
    res.json({ ok: true, data: { user: req.user, profile } });
  } catch (error) {
    next(error);
  }
});

// ── Admin-specific auth routes ─────────────────────────────────────────────────

// POST /api/auth/admin-login
router.post("/admin-login", (req, res, next) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    const envUser = process.env.ADMIN_USERNAME || "admin";
    const envPass = process.env.ADMIN_PASSWORD || "";

    if (
      !username ||
      !password ||
      username !== envUser ||
      password !== envPass
    ) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid admin credentials",
        401,
      );
    }

    const payload = `admin:${Date.now()}`;
    const token = signAdminToken(payload);
    res.cookie(ADMIN_COOKIE, token, adminCookieOptions());
    res.json({ ok: true, data: { admin: true } });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/admin-logout
router.post("/admin-logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: "/" });
  res.json({ ok: true, data: { loggedOut: true } });
});

// GET /api/auth/admin-me
router.get("/admin-me", (req, res) => {
  const token = req.cookies?.[ADMIN_COOKIE];
  const admin = token ? verifyAdminToken(token) : false;
  res.json({ ok: true, data: { admin } });
});

export default router;
