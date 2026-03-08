import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    username: text("username"),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    isAdmin: integer("is_admin").notNull().default(0),
    isVerified: integer("is_verified").notNull().default(0),
    isBanned: integer("is_banned").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
    usernameIdx: uniqueIndex("users_username_unique").on(table.username),
  }),
);

// ── Auth Providers ────────────────────────────────────────────────────────────
export const authProviders = sqliteTable(
  "auth_providers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'telegram' | 'google' | 'email' | 'phone'
    providerUserId: text("provider_user_id").notNull(),
    providerEmail: text("provider_email"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    linkedAt: integer("linked_at").notNull(),
    isPrimary: integer("is_primary").notNull().default(0),
  },
  (table) => ({
    providerUniqueIdx: uniqueIndex("auth_providers_provider_uid").on(
      table.provider,
      table.providerUserId,
    ),
    userIdIdx: index("auth_providers_user_id_idx").on(table.userId),
  }),
);

// ── OTP Codes ─────────────────────────────────────────────────────────────────
export const otpCodes = sqliteTable("otp_codes", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  target: text("target").notNull(),
  purpose: text("purpose").notNull(), // 'login' | 'register' | 'verify' | 'link'
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull(),
});

// ── Email Verifications ───────────────────────────────────────────────────────
export const emailVerifications = sqliteTable("email_verifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull(),
  expiresAt: integer("expires_at").notNull(),
  verifiedAt: integer("verified_at"),
  createdAt: integer("created_at").notNull(),
});

// ── Password Resets ───────────────────────────────────────────────────────────
export const passwordResets = sqliteTable("password_resets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull(),
});

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  metadata: text("metadata"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at").notNull(),
});

// ── Student Profiles ──────────────────────────────────────────────────────────
export const studentProfiles = sqliteTable("student_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  grade: integer("grade"),
  country: text("country").notNull().default("Uzbekistan"),
  targetMajor: text("target_major"),
  satMath: integer("sat_math"),
  satReadingWriting: integer("sat_reading_writing"),
  satTotal: integer("sat_total"),
  ieltsScore: real("ielts_score"),
  updatedAt: integer("updated_at").notNull(),
});

// ── Universities ──────────────────────────────────────────────────────────────
export const universities = sqliteTable(
  "universities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    state: text("state").notNull(),
    tuitionUsd: integer("tuition_usd"),
    aidPolicy: text("aid_policy"),
    satRangeMin: integer("sat_range_min"),
    satRangeMax: integer("sat_range_max"),
    englishReq: text("english_req"),
    applicationDeadline: text("application_deadline"),
    description: text("description"),
  },
  (table) => ({
    nameIdx: uniqueIndex("universities_name_unique").on(table.name),
  }),
);

export const universityFacts = sqliteTable("university_facts", {
  id: text("id").primaryKey(),
  universityId: text("university_id")
    .notNull()
    .references(() => universities.id, { onDelete: "cascade" }),
  factText: text("fact_text").notNull(),
  sourceUrl: text("source_url").notNull(),
  tag: text("tag"),
  year: integer("year"),
  createdAt: integer("created_at").notNull(),
  isVerified: integer("is_verified").notNull().default(0),
});

// ── SAT ───────────────────────────────────────────────────────────────────────
export const satTopics = sqliteTable("sat_topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const satQuestions = sqliteTable("sat_questions", {
  id: text("id").primaryKey(),
  topicId: text("topic_id")
    .notNull()
    .references(() => satTopics.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  choicesJson: text("choices_json").notNull(),
  correctChoice: text("correct_choice").notNull(),
  explanationText: text("explanation_text").notNull(),
});

export const satAttempts = sqliteTable("sat_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topicId: text("topic_id")
    .notNull()
    .references(() => satTopics.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

// ── User Preferences ──────────────────────────────────────────────────────────
export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"),
  accent: text("accent").notNull().default("sky"),
  vibe: text("vibe").notNull().default("minimal"),
  onboardingDone: integer("onboarding_done").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});
