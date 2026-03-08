import { Router } from "express";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { studentProfiles, linkedIdentities } from "../db/schema";
import { supabaseAdmin } from "../utils/supabase";
import { AppError } from "../utils/error";
import { validateTelegramAuth, getTelegramDisplayName, type TelegramAuthData } from "../services/telegramAuth";
import { randomBytes } from "crypto";

const router = Router();

// Used for minting our own JWTs for custom providers (like Telegram) that Supabase doesn't natively support
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "super-secret-jwt-key-for-supabase-change-in-prod";

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

// ── Set Username ───────────────────────────────────────────────────────────
// This is called by the frontend immediately after a successful Supabase native login/signup
router.post("/set-username", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AppError("UNAUTHORIZED", "Missing Auth Token", 401);

    const token = authHeader.replace("Bearer ", "");
    // Verify token with Supabase directly
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw new AppError("UNAUTHORIZED", "Invalid Supabase Token", 401);

    const { username } = req.body;
    if (!username) throw new AppError("INVALID_INPUT", "Username is required", 400);

    const db = getDb();
    
    // Check if username is taken
    const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.username, username));
    if (existing.length > 0 && existing[0].userId !== user.id) {
      throw new AppError("USERNAME_TAKEN", "This username is already taken", 409);
    }

    // Upsert student profile with the new username
    await db.insert(studentProfiles).values({
      userId: user.id,
      username: username,
    }).onConflictDoUpdate({
      target: studentProfiles.userId,
      set: { username, updatedAt: new Date() }
    });

    res.json({ ok: true, data: { username } });
  } catch (error) {
    next(error);
  }
});

// ── Check Username Availability ───────────────────────────────────────────────
router.get("/check-username", async (req, res, next) => {
  try {
    const username = (req.query.username as string) || "";
    if (username.length < 3) return res.json({ ok: true, data: { available: false, error: "Too short" } });

    const db = getDb();
    const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.username, username));
    
    res.json({ ok: true, data: { available: existing.length === 0 } });
  } catch (error) {
    next(error);
  }
});

// ── Username Login Proxy ───────────────────────────────────────────────────────
// Because Supabase doesn't natively support "username/password" login natively, we resolve the username
// to an email, and let the frontend do the actual Supabase signInWithPassword, or we do it here.
router.post("/login-username", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw new AppError("INVALID_INPUT", "Username and password required", 400);

    const db = getDb();
    const profile = await db.select().from(studentProfiles).where(eq(studentProfiles.username, username));
    if (profile.length === 0) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid username or password", 401);
    }

    const userId = profile[0].userId;
    // Fetch user from Supabase Admin to get the target email
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error || !user || !user.email) {
      throw new AppError("INVALID_CREDENTIALS", "User does not have an attached email", 401);
    }

    // Instead of doing the login here and having cookie persistence issues, we can securely return the email
    // back to the frontend ONLY IF we verified auth? No, that exposes user emails.
    // Better: We perform signInWithPassword on the backend and return the Supabase session!
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (signInError || !sessionData.session) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid username or password", 401);
    }

    res.json({
      ok: true,
      data: {
        session: sessionData.session,
        user: sessionData.user,
      }
    });

  } catch (error) {
    next(error);
  }
});

// ── Telegram Auth & Linking Proxy ───────────────────────────────────────────────
router.post("/telegram", async (req, res, next) => {
  try {
    const authData = req.body as TelegramAuthData;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new AppError("CONFIG_ERROR", "Telegram bot token missing", 500);

    const isValid = validateTelegramAuth(authData, botToken);
    if (!isValid) throw new AppError("INVALID_AUTH", "Invalid Telegram signature", 401);

    const providerUserId = String(authData.id);
    const db = getDb();
    
    // Check if identity exists
    let identity = await db.select().from(linkedIdentities)
      .where(eq(linkedIdentities.providerUserId, providerUserId));

    let targetUserId = "";

    if (identity.length > 0) {
      targetUserId = identity[0].userId;
    } else {
      // If the user sent a Bearer token, they are LINKING their account
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          targetUserId = user.id;
          // Create link
          await db.insert(linkedIdentities).values({
            userId: targetUserId,
            provider: "telegram",
            providerUserId: providerUserId,
          });
        }
      }
      
      // If STILL no targetUserId, it means they are doing a fresh LOGIN via Telegram,
      // We must create a dummy Supabase user to represent this Telegram identity natively.
      if (!targetUserId) {
        const dummyEmail = `telegram_${providerUserId}@sypev-dummy.local`;
        const dummyPassword = randomBytes(16).toString("hex");
        
        const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
          email: dummyEmail,
          password: dummyPassword,
          email_confirm: true,
          user_metadata: {
            name: getTelegramDisplayName(authData),
            provider: "telegram"
          }
        });

        if (error || !user) throw new AppError("CREATE_FAILED", "Could not create Telegram mapped identity", 500);
        targetUserId = user.id;

        await db.insert(linkedIdentities).values({
          userId: targetUserId,
          provider: "telegram",
          providerUserId: providerUserId,
        });
      }
    }

    // Now we have the targetUserId. We generate a custom JWT using Supabase JWT Secret
    // so the frontend can interface with RLS and our DB as if they were natively logged in.
    const customJwtPayload = {
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 1 week
      sub: targetUserId,
      email: `telegram_${providerUserId}@sypev-dummy.local`,
      role: "authenticated",
      app_metadata: {
        provider: "telegram",
        providers: ["telegram"]
      }
    };
    
    const token = jwt.sign(customJwtPayload, SUPABASE_JWT_SECRET);
    
    res.json({
      ok: true,
      data: {
        session: {
          access_token: token,
          refresh_token: token, // Dummy refresh token
          expires_in: 60 * 60 * 24 * 7,
          user: { id: targetUserId }
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// ── Me (Profile Data Resolver) ───────────────────────────────────────────────
router.get("/me", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json({ ok: true, data: { user: null } });

    const token = authHeader.replace("Bearer ", "");
    
    // Validate with Supabase OR jsonwebtoken (if it's our dummy Telegram token)
    let userRecord = null;
    
    try {
      // First try native Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        userRecord = user;
      } else {
        // Fallback: Custom dummy JWT validation (Telegram)
        const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as any;
        if (payload && payload.sub) {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(payload.sub);
          userRecord = user;
        }
      }
    } catch(e) { /* invalid token */ }

    if (!userRecord) return res.json({ ok: true, data: { user: null } });

    const db = getDb();
    
    const profile = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userRecord.id));
    const linked = await db.select().from(linkedIdentities).where(eq(linkedIdentities.userId, userRecord.id));

    res.json({
      ok: true,
      data: {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.user_metadata?.name || "User",
          username: profile[0]?.username || null,
          needsUsername: !profile[0]?.username,
        },
        profile: profile[0],
        providers: linked.map(l => ({ provider: l.provider, linkedAt: l.linkedAt }))
      }
    });
  } catch(error) {
    next(error);
  }
});
// ── Admin Native Fallback ─────────────────────────────────────────────────────────
router.post("/admin-login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD &&
      username !== undefined
    ) {
      res.cookie("sypev_admin", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return res.json({ ok: true, data: { admin: true } });
    }
    throw new AppError("UNAUTHORIZED", "Invalid admin credentials", 401);
  } catch (error) {
    next(error);
  }
});

router.post("/admin-logout", async (req, res, next) => {
  try {
    res.clearCookie("sypev_admin", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ ok: true, data: { loggedOut: true } });
  } catch (error) {
    next(error);
  }
});

router.get("/admin-me", async (req, res, next) => {
  try {
    const adminCookie = req.cookies?.["sypev_admin"];
    if (adminCookie) {
      return res.json({ ok: true, data: { admin: true } });
    }
    return res.json({ ok: true, data: { admin: false } });
  } catch (error) {
    next(error);
  }
});

export default router;
