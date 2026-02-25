/**
 * CLI script to promote a user to admin by email.
 * Usage: npx tsx server/src/scripts/setAdmin.ts user@example.com
 */
import { eq } from "drizzle-orm";
import { getDb, ensureSchema } from "../db";
import { users } from "../db/schema";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx server/src/scripts/setAdmin.ts <email>");
    process.exit(1);
  }

  ensureSchema();
  const db = getDb();

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();
  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    process.exit(1);
  }

  await db.update(users).set({ isAdmin: 1 }).where(eq(users.id, user.id));
  console.log(`✅ User "${user.name}" (${user.email}) promoted to admin!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
