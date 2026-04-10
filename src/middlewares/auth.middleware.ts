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

  req.user = verifyAccessToken(accessToken);
  next();
};

export const requireRole =
  (allowedRoles: Array<"ADMIN" | "CANDIDATE">) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Forbidden");
    }

    next();
  };
