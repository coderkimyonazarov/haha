import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database.Database | null = null;

export function getDbPath() {
  const runningInLambda =
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    process.cwd().startsWith("/var/task");

  if (runningInLambda) {
    return path.resolve("/tmp", process.env.DB_PATH || "sypev.sqlite");
  }

  return path.resolve(
    process.cwd(),
    process.env.DB_PATH || "./data/dev.sqlite",
  );
}

export function ensureDataDir(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getSqlite() {
  if (!sqliteInstance) {
    const dbPath = getDbPath();
    ensureDataDir(dbPath);
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma("journal_mode = WAL");
    sqliteInstance.pragma("foreign_keys = ON");
  }
  return sqliteInstance;
}

export function ensureSchema() {
  try {
    const sqlite = getSqlite();

    // Run migrations in order
    const migrationFiles = ["0000_init.sql", "0001_auth_upgrade.sql"];

    for (const file of migrationFiles) {
      const migrationCandidates = [
        path.join(process.cwd(), "drizzle", file),
        path.join(process.cwd(), "server", "drizzle", file),
      ];
      const migrationPath = migrationCandidates.find((c) => fs.existsSync(c));
      if (!migrationPath) continue;

      try {
        const sql = fs.readFileSync(migrationPath, "utf-8");
        sqlite.exec(sql);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("already exists") ||
            error.message.includes("duplicate column"))
        ) {
          continue;
        }
        console.warn(`Migration ${file} warning:`, error);
      }
    }
  } catch (error) {
    console.error("Schema migration error:", error);
    throw error;
  }
}

export function getDb() {
  if (!dbInstance) {
    const sqlite = getSqlite();
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;
