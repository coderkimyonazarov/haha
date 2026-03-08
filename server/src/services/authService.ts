import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { userPreferences, studentProfiles, auditLogs } from "../db/schema";

export async function getUserPreferences(userId: string) {
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
  const db = getDb();
  await db.insert(auditLogs).values({
    userId: params.userId || null,
    action: params.action,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    ip: params.ip,
    userAgent: params.userAgent,
  });
}
