import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

export function getQueryClient() {
  if (!queryClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Missing DATABASE_URL in environment for Supabase PostgreSQL.");
    }
    // Setup postgres client
    queryClient = postgres(connectionString, { prepare: false });
  }
  return queryClient;
}

export function getDb() {
  if (!dbInstance) {
    const client = getQueryClient();
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;

export function ensureSchema() {
  // We no longer run manual migrations dynamically in the server startup
  // because Vercel Serverless Functions should not handle heavy DDL migrations.
  // We rely on 'drizzle-kit push' or standard migration scripts instead.
  console.log("Supabase PostgreSQL connection ready. Skipping dynamic SQLite ensureSchema.");
}
