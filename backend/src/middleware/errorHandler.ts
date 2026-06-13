import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { error } from "../lib/api";
import { HttpError } from "../lib/httpError";
import { isProduction } from "../lib/env";
import { logger } from "../utils/logger";

/**
 * Central error handler. Must be registered last, after all routes.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // `next` is required so Express recognises this as an error handler.
  _next: NextFunction,
): Response {
  if (err instanceof HttpError) {
    return error(res, err.message, err.status, err.code, err.details);
  }

  if (err instanceof ZodError) {
    return error(res, "Validation failed", 400, "BAD_REQUEST", err.flatten());
  }

  const message =
    err instanceof Error ? err.message : "Unexpected server error";
  logger.error("Unhandled error", { message });

  return error(
    res,
    isProduction ? "Internal server error" : message,
    500,
    "INTERNAL_ERROR",
  );
}
