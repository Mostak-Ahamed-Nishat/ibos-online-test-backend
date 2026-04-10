import type { NextFunction, Request, Response } from "express";

export const notFoundMiddleware = (
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
