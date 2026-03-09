import type { Request, Response, NextFunction } from "express";
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

  const envelope = isDatabaseUnavailable
    ? { ok: false, error: { code, message } }
    : isAppError
    ? toErrorEnvelope(err)
    : { ok: false, error: { code, message } };

  res.status(status).json(envelope);
}
