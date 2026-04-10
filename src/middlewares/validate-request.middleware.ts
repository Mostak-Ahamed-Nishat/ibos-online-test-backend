import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validateRequest = (schemas: ValidationSchemas): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Validate and replace request payloads with parsed values.
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    if (schemas.params) {
      const parsedParams = schemas.params.parse(req.params);
      Object.assign(req.params, parsedParams);
    }

    if (schemas.query) {
      const parsedQuery = schemas.query.parse(req.query);
      Object.assign(req.query as Record<string, unknown>, parsedQuery);
    }

    next();
  };
};
