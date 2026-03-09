import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/error";
import { getSupabaseAdmin } from "../utils/supabase";

export const getSessionCookieName = () => {
  return "sypev_session_cookie";
};

export const getAdminCookieName = () => "sypev_admin";

// Extends express Request
declare global {
  namespace Express {
    interface Request {
      user?: any; // We can type this to auth.users if needed
      admin?: boolean;
      authSource?: "none" | "bearer" | "telegram" | "admin_cookie";
    }
  }
}

export const authOptional = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    req.authSource = "none";
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      if (!token) {
        return next();
      }

      const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
      if (!error && user) {
        req.user = user;
        req.authSource = "bearer";
      } else {
        const customSecret = process.env.APP_AUTH_JWT_SECRET;
        if (customSecret) {
          try {
            const payload = jwt.verify(token, customSecret) as { sub?: string; provider?: string };
            if (payload?.provider === "telegram" && payload.sub) {
              const {
                data: { user: telegramUser },
              } = await getSupabaseAdmin().auth.admin.getUserById(payload.sub);
              if (telegramUser) {
                req.user = telegramUser;
                req.authSource = "telegram";
              }
            }
          } catch {
            // Ignore invalid custom token and continue as unauthenticated.
          }
        }
      }
    }
    next();
  } catch (error) {
    next();
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError("UNAUTHORIZED", "Authentication required", 401));
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const adminCookie = req.cookies?.[getAdminCookieName()];
  if (adminCookie === "true") {
    req.admin = true;
    req.authSource = "admin_cookie";
    return next();
  }

  if (!req.user) {
    return next(new AppError("UNAUTHORIZED", "Authentication required", 401));
  }

  const metadata = (req.user?.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = (req.user?.app_metadata ?? {}) as Record<string, unknown>;
  const isAdminByMetadata =
    metadata.isAdmin === true ||
    metadata.is_admin === true ||
    metadata.role === "admin" ||
    appMetadata.role === "admin";

  if (isAdminByMetadata) {
    req.admin = true;
    return next();
  }
  return next(new AppError("FORBIDDEN", "Admin access required", 403));
};
