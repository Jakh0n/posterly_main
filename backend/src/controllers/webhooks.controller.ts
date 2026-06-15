import type { Request, Response } from "express";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

import { env } from "../lib/env";
import { logger } from "../utils/logger";
import { handlePolarEvent } from "../services/billing";

/**
 * Polar webhook receiver. The route is mounted with `express.raw` so the body
 * arrives unparsed for signature verification. On a valid signature the event
 * is processed (credits granted / plan updated); invalid signatures get 403.
 * Returns 202 quickly so Polar does not retry on slow processing.
 */
export async function handlePolarWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  let event;
  try {
    event = validateEvent(
      req.body as Buffer,
      req.headers as Record<string, string>,
      env.POLAR_WEBHOOK_SECRET,
    );
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      logger.warn("Rejected Polar webhook with invalid signature");
      res.status(403).send("");
      return;
    }
    throw err;
  }

  try {
    await handlePolarEvent(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown webhook error";
    logger.error("Failed to process Polar webhook", {
      type: event.type,
      message,
    });
    res.status(500).send("");
    return;
  }

  res.status(202).send("");
}
