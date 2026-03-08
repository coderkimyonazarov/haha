import type { Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db";
import { users, sessions } from "../db/schema";

// ── Types ─────────────────────────────────────────────────────────────────────
export type AuthUser = {
  id: string;
  email: string | null;
  username: string | null;
  name: string;
  isAdmin: number;
  isVerified: number;
  isBanned: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

// ── Cookie ────────────────────────────────────────────────────────────────────
export function getSessionCookieName() {
  return "sypev_session";
}

// ── Session Resolution ────────────────────────────────────────────────────────
async function resolveSession(req: Request): Promise<AuthUser | null> {
  const sessionId = req.cookies?.[getSessionCookieName()];
  if (!sessionId) return null;

  const db = getDb();
  const now = Date.now();

  const session = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .get();

  if (!session) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  if (!user) return null;
  if (user.isBanned) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
  };
}

// ── Optional Auth ─────────────────────────────────────────────────────────────
export async function authOptional(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    req.user = (await resolveSession(req)) || undefined;
  } catch (error) {
    console.warn("Session resolve error:", error);
    req.user = undefined;
  }
  next();
}

// ── Required Auth ─────────────────────────────────────────────────────────────
export async function authRequired(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    req.user = (await resolveSession(req)) || undefined;
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
  }
}

// ── Admin auth ────────────────────────────────────────────────────────────────
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const { createHmac, timingSafeEqual } = require("crypto");
  const ADMIN_COOKIE = "sypev_admin";

  function getAdminSecret() {
    return process.env.ADMIN_SECRET || "sypev_admin_secret_change_me";
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

  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Admin access required" },
    });
  }
  next();
}
