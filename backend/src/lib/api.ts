import type { Response } from "express";

import type { ApiResponse } from "../types/api";

/**
 * Sends a successful JSON response with a consistent envelope.
 */
export function ok<T>(res: Response, data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return res.status(status).json(body);
}

/**
 * Sends a `201 Created` JSON response.
 */
export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

/**
 * Sends an error JSON response with a consistent envelope.
 */
export function error(
  res: Response,
  message: string,
  status = 500,
  code?: string,
  details?: unknown,
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: { message, code, details },
  };
  return res.status(status).json(body);
}
