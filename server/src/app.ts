import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import universitiesRouter from "./routes/universities";
import admissionsRouter from "./routes/admissions";
import aiRouter from "./routes/ai";
import satRouter from "./routes/sat";
import adminRouter from "./routes/admin";
import { requestId } from "./middleware/requestId";
import { authOptional, authRequired, requireAdmin } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { AppError } from "./utils/error";

const app = express();

app.use(requestId);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "0.1.0",
  });
});

app.use("/api/auth", authOptional, authRouter);
app.use("/api/profile", authRequired, profileRouter);
app.use("/api/universities", authOptional, universitiesRouter);
app.use("/api/sat", authOptional, satRouter);
app.use("/api/admissions", authRequired, admissionsRouter);
app.use("/api/ai", authRequired, aiRouter);
app.use("/api/admin", authRequired, requireAdmin, adminRouter);

const webDistCandidates = [
  path.resolve(process.cwd(), "web", "dist"),
  path.resolve(__dirname, "..", "..", "web", "dist"),
];
const webDist = webDistCandidates.find((candidate) => fs.existsSync(candidate));
if (webDist) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((_req, _res, next) => {
  next(new AppError("NOT_FOUND", "Route not found", 404));
});

app.use(errorHandler);

export default app;
