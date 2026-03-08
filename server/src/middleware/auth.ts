import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/error";
import { supabaseAdmin } from "../utils/supabase";

export const getSessionCookieName = () => {
  return "sypev_session_cookie";
};

// Extends express Request
declare global {
  namespace Express {
    interface Request {
      user?: any; // We can type this to auth.users if needed
      admin?: boolean;
    }
  }
}

export const authOptional = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        req.user = user;
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
  // Simple check for our admin cookie for internal admin tasks
  const adminCookie = req.cookies?.["sypev_admin"];
  if (adminCookie) {
    req.admin = true;
    return next();
  }
  return next(new AppError("FORBIDDEN", "Admin access required", 403));
};
