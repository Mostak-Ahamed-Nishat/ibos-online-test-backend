import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    statusCode: 500,
    message: "Internal server error",
    ...(process.env.NODE_ENV !== "production" && error instanceof Error
      ? { error: error.message }
      : {}),
  });
};
