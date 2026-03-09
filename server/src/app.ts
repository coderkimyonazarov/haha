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
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== "production";
const isLocalOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        (isDev && isLocalOrigin(origin)) ||
        origin.endsWith(".vercel.app") ||
        origin === "https://sypev.com" ||
        origin === "https://www.sypev.com" ||
        origin === process.env.VITE_API_URL;
        
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-custom-auth", "sypev-admin", "x-bot-secret"],
  }),
);

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(requestId);
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
