import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import { ensureSchema, getDb } from "./db";
import { requestId } from "./middleware/requestId";
import { authOptional, requireAdmin } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter, authLimiter } from "./middleware/rateLimit";

import authRouter from "./routes/auth";
import accountLinkRouter from "./routes/accountLink";
import profileRouter from "./routes/profile";
import universitiesRouter from "./routes/universities";
import admissionsRouter from "./routes/admissions";
import aiRouter from "./routes/ai";
import adminRouter from "./routes/admin";

// ── Bootstrap ─────────────────────────────────────────────────────────────────
ensureSchema();

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts for Telegram widget etc.
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(requestId);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(globalLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────

// Auth (optional auth middleware so /me works, rate limited)
app.use("/api/auth", authLimiter, authOptional, authRouter);

// Account linking (requires auth — handled inside route)
app.use("/api/account", authOptional, accountLinkRouter);

// Protected routes
app.use("/api/profile", authOptional, profileRouter);
app.use("/api/universities", authOptional, universitiesRouter);
app.use("/api/admissions", authOptional, admissionsRouter);
app.use("/api/ai", authOptional, aiRouter);

// Admin routes
app.use("/api/admin", requireAdmin, adminRouter);

// ── Static + SPA Fallback ─────────────────────────────────────────────────────
const distPath = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export { app };
