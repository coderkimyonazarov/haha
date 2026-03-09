const fs = require("fs");
const path = require("path");

const requiredGroups = [
  ["BOT_TOKEN", "TELEGRAM_BOT_TOKEN"],
  ["BOT_INTERNAL_API_KEY", "APP_AUTH_JWT_SECRET", "ADMIN_SECRET"],
];
const envFiles = [
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "bot/.env"),
];

const values = new Map();

for (const group of requiredGroups) {
  for (const key of group) {
    if (process.env[key] && String(process.env[key]).trim()) {
      values.set(key, String(process.env[key]).trim());
    }
  }
}

for (const filePath of envFiles) {
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }

    const idx = line.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const isRelevant = requiredGroups.some((group) => group.includes(key));
    if (!isRelevant || values.has(key)) {
      continue;
    }

    const rawValue = line.slice(idx + 1).trim();
    const normalized = rawValue.replace(/^['\"]|['\"]$/g, "");
    if (normalized) {
      values.set(key, normalized);
    }
  }
}

const allGroupsPresent = requiredGroups.every((group) => group.some((key) => values.has(key)));
if (allGroupsPresent) {
  process.exit(0);
}

process.exit(1);
