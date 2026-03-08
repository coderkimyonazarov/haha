import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

export function getDbConfigStatus() {
  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    dbClientInitialized: Boolean(queryClient),
    drizzleInitialized: Boolean(dbInstance),
  };
}

export function getQueryClient() {
  if (!queryClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is missing");
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

export async function ensureSchema() {
  try {
    const client = getQueryClient();
    // Simple query to verify connection
    await client`SELECT 1`;
    console.log("Supabase PostgreSQL connection verified.");
  } catch (error) {
    console.error("Failed to connect to Supabase PostgreSQL:", error);
    // We don't exit here to allow the app to potentially recover or show specific errors
  }
}
