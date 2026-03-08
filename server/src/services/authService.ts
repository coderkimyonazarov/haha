import { randomUUID } from "crypto";
import argon2 from "argon2";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  authProviders,
  sessions,
  studentProfiles,
  auditLogs,
  userPreferences,
} from "../db/schema";

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "support",
  "help",
  "system",
  "moderator",
  "mod",
  "sypev",
  "api",
  "null",
  "undefined",
  "login",
  "register",
  "settings",
  "profile",
  "dashboard",
  "logout",
]);

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/;

// ── Types ─────────────────────────────────────────────────────────────────────
export type ProviderType = "telegram" | "google" | "email" | "phone";

export type AuthResult = {
  user: typeof users.$inferSelect;
  sessionId: string;
  isNewUser: boolean;
  needsUsername: boolean;
};

// ── Session Creation ──────────────────────────────────────────────────────────
export async function createSession(userId: string): Promise<string> {
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

// ── Find User by Provider ─────────────────────────────────────────────────────
export async function findUserByProvider(
  provider: ProviderType,
  providerUserId: string,
) {
  const db = getDb();
  const row = await db
    .select()
    .from(authProviders)
    .where(
      and(
        eq(authProviders.provider, provider),
        eq(authProviders.providerUserId, providerUserId),
      ),
    )
    .get();
  if (!row) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, row.userId))
    .get();
  return user || null;
}

// ── Find User by Email ────────────────────────────────────────────────────────
export async function findUserByEmail(email: string) {
  const db = getDb();
  return db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .get();
}

// ── Find User by Username ─────────────────────────────────────────────────────
export async function findUserByUsername(username: string) {
  const db = getDb();
  return db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase().trim()))
    .get();
}

// ── Create User ───────────────────────────────────────────────────────────────
export async function createUser(params: {
  name: string;
  email?: string | null;
  username?: string | null;
  passwordHash?: string | null;
}) {
  const db = getDb();
  const userId = randomUUID();
  const now = Date.now();

  await db.insert(users).values({
    id: userId,
    email: params.email?.toLowerCase().trim() || null,
    username: params.username?.toLowerCase().trim() || null,
    name: params.name,
    passwordHash: params.passwordHash || null,
    isAdmin: 0,
    isVerified: 0,
    isBanned: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Create default student profile
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

  // Initialize default preferences
  await db.insert(userPreferences).values({
    userId,
    theme: "system",
    accent: "sky",
    vibe: "minimal",
    onboardingDone: 0,
    updatedAt: now,
  });

  return db.select().from(users).where(eq(users.id, userId)).get()!;
}

// ── Link Provider to User ─────────────────────────────────────────────────────
export async function linkProvider(params: {
  userId: string;
  provider: ProviderType;
  providerUserId: string;
  providerEmail?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  const db = getDb();

  // Check if provider already linked to another user
  const existing = await db
    .select()
    .from(authProviders)
    .where(
      and(
        eq(authProviders.provider, params.provider),
        eq(authProviders.providerUserId, params.providerUserId),
      ),
    )
    .get();

  if (existing) {
    if (existing.userId === params.userId) return existing; // idempotent
    throw new Error(
      `This ${params.provider} account is already linked to a different user.`,
    );
  }

  const id = randomUUID();
  await db.insert(authProviders).values({
    id,
    userId: params.userId,
    provider: params.provider,
    providerUserId: params.providerUserId,
    providerEmail: params.providerEmail || null,
    accessToken: params.accessToken || null,
    refreshToken: params.refreshToken || null,
    linkedAt: Date.now(),
    isPrimary: 0,
  });

  return db.select().from(authProviders).where(eq(authProviders.id, id)).get()!;
}

// ── Get User Providers ────────────────────────────────────────────────────────
export async function getUserProviders(userId: string) {
  const db = getDb();
  return db
    .select({
      id: authProviders.id,
      provider: authProviders.provider,
      providerUserId: authProviders.providerUserId,
      providerEmail: authProviders.providerEmail,
      linkedAt: authProviders.linkedAt,
    })
    .from(authProviders)
    .where(eq(authProviders.userId, userId));
}

// ── Unlink Provider from User ─────────────────────────────────────────────────
export async function unlinkProvider(userId: string, provider: ProviderType) {
  const db = getDb();

  // Ensure user has at least one other provider or a password
  const allProviders = await db
    .select()
    .from(authProviders)
    .where(eq(authProviders.userId, userId));
  const user = await db.select().from(users).where(eq(users.id, userId)).get();

  const otherProviders = allProviders.filter((p) => p.provider !== provider);
  if (otherProviders.length === 0 && !user?.passwordHash) {
    throw new Error(
      "Cannot unlink the only authentication method. Add another provider or set a password first.",
    );
  }

  await db
    .delete(authProviders)
    .where(
      and(
        eq(authProviders.userId, userId),
        eq(authProviders.provider, provider),
      ),
    );
}

// ── Find or Create by Provider (main OAuth flow) ──────────────────────────────
export async function findOrCreateByProvider(params: {
  provider: ProviderType;
  providerUserId: string;
  name: string;
  email?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}): Promise<AuthResult> {
  // 1. Check if this provider is already linked
  const existingUser = await findUserByProvider(
    params.provider,
    params.providerUserId,
  );
  if (existingUser) {
    if (existingUser.isBanned) {
      throw new Error("Account is banned.");
    }
    const sessionId = await createSession(existingUser.id);
    return {
      user: existingUser,
      sessionId,
      isNewUser: false,
      needsUsername: !existingUser.username,
    };
  }

  // 2. Check if email matches an existing user (auto-link if verified)
  if (params.email) {
    const emailUser = await findUserByEmail(params.email);
    if (emailUser) {
      if (emailUser.isBanned) {
        throw new Error("Account is banned.");
      }
      // Auto-link this new provider to the existing email-matched user
      await linkProvider({
        userId: emailUser.id,
        provider: params.provider,
        providerUserId: params.providerUserId,
        providerEmail: params.email,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
      });
      const sessionId = await createSession(emailUser.id);
      return {
        user: emailUser,
        sessionId,
        isNewUser: false,
        needsUsername: !emailUser.username,
      };
    }
  }

  // 3. Create new user + link provider
  const newUser = await createUser({
    name: params.name,
    email: params.email,
  });

  await linkProvider({
    userId: newUser.id,
    provider: params.provider,
    providerUserId: params.providerUserId,
    providerEmail: params.email,
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
  });

  const sessionId = await createSession(newUser.id);
  return {
    user: newUser,
    sessionId,
    isNewUser: true,
    needsUsername: true,
  };
}

// ── Username Validation ───────────────────────────────────────────────────────
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }
  const clean = username.trim().toLowerCase();
  if (clean.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (clean.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }
  if (!USERNAME_REGEX.test(clean)) {
    return {
      valid: false,
      error:
        "Username must start with a letter and contain only letters, numbers, and underscores",
    };
  }
  if (RESERVED_USERNAMES.has(clean)) {
    return { valid: false, error: "This username is reserved" };
  }
  return { valid: true };
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const validation = validateUsername(username);
  if (!validation.valid) return false;
  const existing = await findUserByUsername(username);
  return !existing;
}

export async function setUsername(userId: string, username: string) {
  const validation = validateUsername(username);
  if (!validation.valid) throw new Error(validation.error);

  const existing = await findUserByUsername(username);
  if (existing && existing.id !== userId) {
    throw new Error("Username is already taken");
  }

  const db = getDb();
  await db
    .update(users)
    .set({
      username: username.toLowerCase().trim(),
      updatedAt: Date.now(),
    })
    .where(eq(users.id, userId));

  return db.select().from(users).where(eq(users.id, userId)).get()!;
}

// ── Audit Logging ─────────────────────────────────────────────────────────────
export async function logAudit(params: {
  userId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  const db = getDb();
  await db.insert(auditLogs).values({
    id: randomUUID(),
    userId: params.userId || null,
    action: params.action,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    ip: params.ip || null,
    userAgent: params.userAgent || null,
    createdAt: Date.now(),
  });
}

// ── Password Helpers ──────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ── Preferences ───────────────────────────────────────────────────────────────
export async function getUserPreferences(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .get();
}

export async function updatePreferences(
  userId: string,
  params: Partial<typeof userPreferences.$inferInsert>,
) {
  const db = getDb();
  const now = Date.now();
  await db
    .update(userPreferences)
    .set({
      ...params,
      updatedAt: now,
    })
    .where(eq(userPreferences.userId, userId));
  return getUserPreferences(userId);
}

export { SESSION_TTL_MS };
