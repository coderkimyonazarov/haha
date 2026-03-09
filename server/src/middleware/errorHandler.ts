import type { Request, Response, NextFunction } from "express";
import { getDb, isDatabaseHealthy } from "../db";
import { auditLogs } from "../db/schema";
import { AppError, toErrorEnvelope } from "../utils/error";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as Request & { id?: string }).id || "unknown";
  const isDatabaseUnavailable =
    err instanceof Error && err.message === "DATABASE_UNAVAILABLE";
  const isAppError = err instanceof AppError;
  const status = isDatabaseUnavailable ? 503 : isAppError ? err.status : 500;
  const code = isDatabaseUnavailable
    ? "DATABASE_UNAVAILABLE"
    : isAppError
      ? err.code
      : "INTERNAL_ERROR";
  const message = isDatabaseUnavailable
    ? "Database service temporarily unavailable"
    : isAppError
      ? err.message
      : "Unexpected error";

  if (process.env.NODE_ENV !== "test") {
    if (isDatabaseUnavailable) {
      console.warn(`[${requestId}] database unavailable for ${req.method} ${req.path}`);
    } else {
      console.error(`[${requestId}]`, err);
    }
  }

  if (!isDatabaseUnavailable && isDatabaseHealthy()) {
    const errorName = err instanceof Error ? err.name : "UnknownError";
    const errorMessage = err instanceof Error ? err.message : message;
    void (async () => {
      try {
        const db = getDb();
        await db.insert(auditLogs).values({
          userId: req.user?.id ?? null,
          action: "server_error",
          metadata: JSON.stringify({
            code,
            message: errorMessage,
            name: errorName,
            method: req.method,
            path: req.path,
            requestId,
          }),
          ip:
            req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
            req.socket?.remoteAddress ||
            null,
          userAgent: req.headers["user-agent"] ?? null,
        });
      } catch {
        // avoid recursive failures from error handler
      }
    })();
  }

  const envelope = isDatabaseUnavailable
    ? { ok: false, error: { code, message } }
    : isAppError
    ? toErrorEnvelope(err)
    : { ok: false, error: { code, message } };

  res.status(status).json(envelope);
}
