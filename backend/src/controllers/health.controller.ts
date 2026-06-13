import type { NextFunction, Request, Response } from "express";

import { ok } from "../lib/api";
import { getHealthStatus } from "../services/health.service";

export async function healthCheck(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, getHealthStatus());
  } catch (err) {
    next(err);
  }
}
