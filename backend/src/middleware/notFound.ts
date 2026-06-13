import type { Request, Response } from "express";

import { error } from "../lib/api";

/**
 * Catch-all handler for unmatched routes.
 */
export function notFound(req: Request, res: Response): Response {
  return error(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    "NOT_FOUND",
  );
}
