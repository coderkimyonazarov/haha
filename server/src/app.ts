import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import { requestId } from "./middleware/requestId";
import { authOptional, requireAdmin } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimit";

import authRouter from "./routes/auth";
import accountLinkRouter from "./routes/accountLink";
import profileRouter from "./routes/profile";
import universitiesRouter from "./routes/universities";
import admissionsRouter from "./routes/admissions";
import satRouter from "./routes/sat";
import aiRouter from "./routes/ai";
import adminRouter from "./routes/admin";
import botRouter from "./routes/bot";

const app = express();
app.set("trust proxy", 1);

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts for Telegram widget etc.
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(requestId);

const normalizeOrigin = (value: string) => value.replace(/\/$/, "");

const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowAnyConfiguredOrigin = configuredOrigins.includes("*");

const allowedOrigins = configuredOrigins
  .filter((origin) => origin !== "*")
  .map(normalizeOrigin);

const appUrl = (process.env.APP_URL || "").trim();
if (appUrl) {
  allowedOrigins.push(normalizeOrigin(appUrl));
}

const allowLocalCors = process.env.ALLOW_LOCAL_CORS !== "false";

const PRIVATE_HOST_PATTERNS = [
  /^10\.\d+\.\d+\.\d+$/,
  /^127\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
];

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) {
    return false;
  }

  if (host === "localhost" || host === "::1" || host === "[::1]") {
    return true;
  }

  if (host.endsWith(".local")) {
    return true;
  }

  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

function isLocalOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return false;
    }
    return isPrivateOrLocalHost(parsed.hostname);
  } catch {
    return false;
  }
}

function isPublicCorsPath(pathname: string): boolean {
  return (
    pathname === "/api/auth/health-auth" ||
    pathname === "/api/auth/telegram/config" ||
    pathname === "/api/auth/admin-me"
  );
}

function isAllowedOrigin(origin: string): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  return (
    allowedOrigins.includes(normalizedOrigin) ||
    (allowLocalCors && isLocalOrigin(normalizedOrigin)) ||
    normalizedOrigin.endsWith(".vercel.app") ||
    normalizedOrigin === "https://sypev.com" ||
    normalizedOrigin === "https://www.sypev.com" ||
    normalizedOrigin === "http://sypev.com" ||
    normalizedOrigin === "http://www.sypev.com"
  );
}

app.use(
  cors((req, callback) => {
    const origin = req.header("origin");
    const corsConfig = {
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-custom-auth",
        "sypev-admin",
        "x-bot-secret",
        "x-requested-with",
      ],
      exposedHeaders: ["x-request-id"],
      optionsSuccessStatus: 204,
    } as const;

    if (!origin) {
      return callback(null, {
        ...corsConfig,
        origin: true,
      });
    }

    try {
      const allowThisOrigin =
        allowAnyConfiguredOrigin ||
        isAllowedOrigin(origin) ||
        (isPublicCorsPath(req.path) && /^https?:\/\//i.test(origin));

      return callback(null, {
        ...corsConfig,
        origin: allowThisOrigin ? origin : false,
      });
    } catch {
      return callback(null, {
        ...corsConfig,
        origin: false,
      });
    }
  }),
);

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(globalLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────

// Auth (optional auth middleware so /me works)
app.use("/api/auth", authOptional, authRouter);

// Account linking (requires auth — handled inside route)
app.use("/api/account", authOptional, accountLinkRouter);

// Protected routes
app.use("/api/profile", authOptional, profileRouter);
app.use("/api/universities", authOptional, universitiesRouter);
app.use("/api/admissions", authOptional, admissionsRouter);
app.use("/api/sat", authOptional, satRouter);
app.use("/api/ai", authOptional, aiRouter);
app.use("/api/bot", authOptional, botRouter);

// Admin routes (cookie or admin-capable bearer token)
app.use("/api/admin", authOptional, requireAdmin, adminRouter);

// ── Static + SPA Fallback ─────────────────────────────────────────────────────
const distPath = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export { app };
