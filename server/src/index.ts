import dotenv from "dotenv";
import path from "path";

const envCandidates = [
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), ".env"),
];

let loadedCount = 0;
for (const envPath of envCandidates) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    loadedCount += 1;
  }
}

if (loadedCount === 0) {
  dotenv.config(); // last fallback: default dotenv resolution
}

async function bootstrap() {
  const { ensureSchema } = await import("./db");
  await ensureSchema();

  const { app } = await import("./app");
  const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap server:", error);
  process.exit(1);
});
