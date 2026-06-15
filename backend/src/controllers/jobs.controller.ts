import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { ok } from "../lib/api";
import { env } from "../lib/env";
import { HttpError } from "../lib/httpError";
import { logger } from "../utils/logger";
import { runGenerationJob } from "../services/generation";

const enqueueSchema = z.object({
  campaignId: z.string().uuid("A valid campaign id is required"),
});

/**
 * Enqueues an async generation job. Authenticated via a shared worker secret
 * so only the trusted frontend can trigger generation. Returns 202 immediately
 * and runs the pipeline in the background.
 */
export async function enqueueGeneration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (env.WORKER_SECRET) {
      const provided = req.header("x-worker-secret");
      if (provided !== env.WORKER_SECRET) {
        throw HttpError.unauthorized("Invalid worker secret");
      }
    }

    const parsed = enqueueSchema.safeParse(req.body);
    if (!parsed.success) {
      throw HttpError.badRequest("Invalid request", parsed.error.flatten());
    }

    const { campaignId } = parsed.data;

    // Fire-and-forget: the job manages its own status + failure handling.
    void runGenerationJob(campaignId).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown job error";
      logger.error("Unhandled generation job error", { campaignId, message });
    });

    ok(res, { campaignId, status: "queued" }, 202);
  } catch (err) {
    next(err);
  }
}
