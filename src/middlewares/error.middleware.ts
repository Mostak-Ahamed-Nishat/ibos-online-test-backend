import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";
import { sendErrorResponse } from "../utils/send-error-response";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (process.env.NODE_ENV === "development") {
    console.error(error);
  }

  if (error instanceof ZodError) {
    sendErrorResponse({
      res,
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
    sendErrorResponse({
      res,
      statusCode: error.statusCode,
      message: error.message,
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    sendErrorResponse({
      res,
      statusCode: 409,
      message: "Duplicate value found",
    });
    return;
  }

  sendErrorResponse({
    res,
    statusCode: 500,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && error instanceof Error
      ? { stack: error.stack }
      : {}),
  });
};
