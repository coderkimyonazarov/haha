import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    telegramId: text("telegram_id"),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    isAdmin: integer("is_admin").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
    telegramIdx: uniqueIndex("users_telegram_unique").on(table.telegramId),
  }),
);

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

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
