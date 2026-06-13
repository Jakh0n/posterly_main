import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";

import { HttpError } from "../lib/httpError";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates and coerces the incoming request against the provided zod schemas.
 * On failure, forwards a `400` `HttpError` with flattened issues.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        Object.assign(req.params, schemas.params.parse(req.params));
      }
      if (schemas.query) {
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(HttpError.badRequest("Validation failed", err.flatten()));
        return;
      }
      next(err);
    }
  };
}
