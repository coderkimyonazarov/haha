import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;
let dbConnectionHealthy: boolean | null = null;
let dbLastError: string | null = null;

async function ensureCoreTables(client: ReturnType<typeof postgres>) {
  await client.unsafe(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS linked_identities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      provider text NOT NULL,
      provider_user_id text NOT NULL,
      linked_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid,
      action text NOT NULL,
      metadata text,
      ip text,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id uuid PRIMARY KEY,
      username text UNIQUE,
      first_name text,
      last_name text,
      gender text,
      birth_year integer,
      interests_json text NOT NULL DEFAULT '[]',
      grade integer,
      country text NOT NULL DEFAULT 'Uzbekistan',
      target_major text,
      sat_math integer,
      sat_reading_writing integer,
      sat_total integer,
      ielts_score real,
      onboarding_completed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS universities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      state text NOT NULL,
      tuition_usd integer,
      aid_policy text,
      sat_range_min integer,
      sat_range_max integer,
      english_req text,
      application_deadline text,
      description text
    );

    CREATE TABLE IF NOT EXISTS university_facts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
      fact_text text NOT NULL,
      source_url text NOT NULL,
      tag text,
      year integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      is_verified boolean NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS sat_topics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text
    );

    CREATE TABLE IF NOT EXISTS sat_questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id uuid NOT NULL REFERENCES sat_topics(id) ON DELETE CASCADE,
      question_text text NOT NULL,
      choices_json text NOT NULL,
      correct_choice text NOT NULL,
      explanation_text text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sat_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      topic_id uuid NOT NULL REFERENCES sat_topics(id) ON DELETE CASCADE,
      score integer NOT NULL,
      total integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id uuid PRIMARY KEY,
      theme text NOT NULL DEFAULT 'system',
      accent text NOT NULL DEFAULT 'sky',
      vibe text NOT NULL DEFAULT 'minimal',
      persona text NOT NULL DEFAULT 'clean_minimal',
      onboarding_done boolean NOT NULL DEFAULT false,
      fun_card_enabled boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS first_name text;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS last_name text;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS gender text;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS birth_year integer;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS interests_json text NOT NULL DEFAULT '[]';
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS persona text NOT NULL DEFAULT 'clean_minimal';
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS fun_card_enabled boolean NOT NULL DEFAULT true;

    CREATE UNIQUE INDEX IF NOT EXISTS linked_identities_provider_uid
      ON linked_identities(provider, provider_user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS linked_identities_user_provider_uid
      ON linked_identities(user_id, provider);
    CREATE INDEX IF NOT EXISTS linked_identities_user_id_idx
      ON linked_identities(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_username_idx
      ON student_profiles(username);
    CREATE UNIQUE INDEX IF NOT EXISTS universities_name_unique
      ON universities(name);
  `);
}

export function getDbConfigStatus() {
  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    dbClientInitialized: Boolean(queryClient),
    drizzleInitialized: Boolean(dbInstance),
    healthy: dbConnectionHealthy,
    lastError: dbLastError,
  };
}

export function getQueryClient() {
  if (!queryClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is missing");
    }
    const normalizedConnectionString = connectionString.replace(/^"|"$/g, "");
    const isLocalDatabase =
      normalizedConnectionString.includes("localhost") ||
      normalizedConnectionString.includes("127.0.0.1");

    // Setup postgres client with finite connection timeout to avoid hanging auth routes.
    queryClient = postgres(normalizedConnectionString, {
      prepare: false,
      ssl: isLocalDatabase ? undefined : "require",
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      onnotice: () => {},
    });
  }
  return queryClient;
}

export function getDb() {
  if (dbConnectionHealthy === false) {
    throw new Error("DATABASE_UNAVAILABLE");
  }

  if (!dbInstance) {
    const client = getQueryClient();
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;

export async function ensureSchema() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is missing. Running without PostgreSQL connection.");
    dbConnectionHealthy = false;
    dbLastError = "DATABASE_URL is missing";
    return;
  }

  try {
    const client = getQueryClient();
    // Simple query to verify connection
    await client`SELECT 1`;
    await ensureCoreTables(client);
    dbConnectionHealthy = true;
    dbLastError = null;
    console.log("Supabase PostgreSQL connection verified and schema ensured.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dbConnectionHealthy = false;
    dbLastError = message;
    console.warn(
      `PostgreSQL unavailable; running in degraded auth mode (username/telegram fallback enabled): ${message}`,
    );
  }
}

export function isDatabaseHealthy(): boolean {
  return dbConnectionHealthy !== false;
}
