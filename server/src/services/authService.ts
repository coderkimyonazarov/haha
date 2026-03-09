import { eq } from "drizzle-orm";
import { getDb, isDatabaseHealthy } from "../db";
import { userPreferences, studentProfiles, auditLogs } from "../db/schema";

export async function getUserPreferences(userId: string) {
  if (!isDatabaseHealthy()) {
    return {
      userId,
      theme: "system",
      accent: "sky",
      vibe: "minimal",
      onboardingDone: false,
    };
  }

  const db = getDb();
  const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (prefs.length === 0) {
    const defaultPrefs = {
      userId,
      theme: "system",
      accent: "sky",
      vibe: "minimal",
      onboardingDone: false,
    };
    await db.insert(userPreferences).values(defaultPrefs);
    return defaultPrefs;
  }
  return prefs[0];
}

export async function updatePreferences(userId: string, data: Partial<any>) {
  if (!isDatabaseHealthy()) {
    return {
      userId,
      theme: (data as any)?.theme ?? "system",
      accent: (data as any)?.accent ?? "sky",
      vibe: (data as any)?.vibe ?? "minimal",
      onboardingDone: Boolean((data as any)?.onboardingDone ?? false),
    };
  }

  const db = getDb();
  await db.update(userPreferences)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userPreferences.userId, userId));
  return getUserPreferences(userId);
}

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  metadata?: any;
  ip?: string;
  userAgent?: string;
}) {
  if (!isDatabaseHealthy()) {
    return;
  }

  const db = getDb();
  await db.insert(auditLogs).values({
    userId: params.userId || null,
    action: params.action,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    ip: params.ip,
    userAgent: params.userAgent,
  });
}
