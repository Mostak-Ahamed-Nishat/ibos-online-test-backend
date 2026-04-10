import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { verifyAccessToken } from "../modules/auth/auth.token";

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Unauthorized");
  }

  const accessToken = authHeader.replace("Bearer ", "").trim();
  if (!accessToken) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    req.user = verifyAccessToken(accessToken);
  } catch (_error) {
    throw new ApiError(401, "Invalid or expired access token");
  }

  next();
};

export const requireRole =
  (allowedRoles: Array<"ADMIN" | "CANDIDATE">) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!allowedRoles.includes(req.user.role)) {
      const debugMessage =
        process.env.NODE_ENV === "development"
          ? `Forbidden: requires one of [${allowedRoles.join(", ")}], got ${req.user.role}`
          : "Forbidden";
      throw new ApiError(403, debugMessage);
    }

    next();
  };
