import dotenv from 'dotenv';
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb, getQueryClient } from "./index";

dotenv.config();

async function runMigrations() {
  console.log("Running migrations on Supabase PostgreSQL...");

  try {
    const db = getDb();
    
    // This will look for migrations in the '/server/drizzle' folder
    await migrate(db, { migrationsFolder: "drizzle" });

    console.log("Migrations applied successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
