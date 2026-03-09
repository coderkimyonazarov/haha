import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  boolean,
} from "drizzle-orm/pg-core";

// Note: user_id references Supabase's auth.users(id), which we won't strictly enforce with Drizzle here
// to avoid cross-schema complexities. Supabase handles auth.users.

// ── Linked Identities ────────────────────────────────────────────────────────
// For custom linkings like Telegram that don't map natively to Supabase identities.
export const linkedIdentities = pgTable(
  "linked_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(), // 'telegram'
    providerUserId: text("provider_user_id").notNull(),
    linkedAt: timestamp("linked_at").notNull().defaultNow(),
  },
  (table) => ({
    providerUniqueIdx: uniqueIndex("linked_identities_provider_uid").on(
      table.provider,
      table.providerUserId
    ),
    userProviderUniqueIdx: uniqueIndex("linked_identities_user_provider_uid").on(
      table.userId,
      table.provider
    ),
    userIdIdx: index("linked_identities_user_id_idx").on(table.userId),
  })
);

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"), // Not enforcing foreign key to auth.users for simplicity
  action: text("action").notNull(),
  metadata: text("metadata"), // or jsonb
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Student Profiles ──────────────────────────────────────────────────────────
export const studentProfiles = pgTable(
  "student_profiles", 
  {
    userId: uuid("user_id").primaryKey(), // maps to auth.users.id
    username: text("username").unique(), // our custom username requirement
    firstName: text("first_name"),
    lastName: text("last_name"),
    gender: text("gender"),
    birthYear: integer("birth_year"),
    interestsJson: text("interests_json").notNull().default("[]"),
    grade: integer("grade"),
    country: text("country").notNull().default("Uzbekistan"),
    targetMajor: text("target_major"),
    satMath: integer("sat_math"),
    satReadingWriting: integer("sat_reading_writing"),
    satTotal: integer("sat_total"),
    ieltsScore: real("ielts_score"),
    onboardingCompletedAt: timestamp("onboarding_completed_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("student_profiles_username_idx").on(table.username),
  })
);

// ── Universities ──────────────────────────────────────────────────────────────
export const universities = pgTable(
  "universities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  })
);

export const universityFacts = pgTable("university_facts", {
  id: uuid("id").primaryKey().defaultRandom(),
  universityId: uuid("university_id")
    .notNull()
    .references(() => universities.id, { onDelete: "cascade" }),
  factText: text("fact_text").notNull(),
  sourceUrl: text("source_url").notNull(),
  tag: text("tag"),
  year: integer("year"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isVerified: boolean("is_verified").notNull().default(false),
});

// ── SAT ───────────────────────────────────────────────────────────────────────
export const satTopics = pgTable("sat_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
});

export const satQuestions = pgTable("sat_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => satTopics.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  choicesJson: text("choices_json").notNull(),
  correctChoice: text("correct_choice").notNull(),
  explanationText: text("explanation_text").notNull(),
});

export const satAttempts = pgTable("sat_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => satTopics.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── User Preferences ──────────────────────────────────────────────────────────
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey(),
  theme: text("theme").notNull().default("system"),
  accent: text("accent").notNull().default("sky"),
  vibe: text("vibe").notNull().default("minimal"),
  persona: text("persona").notNull().default("clean_minimal"),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  funCardEnabled: boolean("fun_card_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
