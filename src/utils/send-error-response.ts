import type { Response } from "express";

type ErrorItem = {
  path: string;
  message: string;
};

interface SendErrorResponseParams {
  res: Response;
  statusCode: number;
  message: string;
  errors?: ErrorItem[];
  stack?: string;
}

export const sendErrorResponse = ({
  res,
  statusCode,
  message,
  errors,
  stack,
}: SendErrorResponseParams): void => {
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errors ? { errors } : {}),
    ...(stack ? { stack } : {}),
  });
};

