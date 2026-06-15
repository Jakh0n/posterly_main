import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { ok } from "../lib/api";
import { HttpError } from "../lib/httpError";
import { BILLING_PACKS, createCheckout } from "../services/billing";

/**
 * Returns the public billing catalog (packs, prices, credit amounts).
 */
export function listBillingPacks(_req: Request, res: Response): void {
  const packs = BILLING_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    kind: pack.kind,
    credits: pack.credits,
    priceUsd: pack.priceUsd,
  }));
  ok(res, { packs });
}

const checkoutSchema = z.object({
  userId: z.string().uuid("A valid user id is required"),
  packId: z.string().min(1, "A pack id is required"),
});

/**
 * Creates a Polar checkout session for a pack and returns the redirect URL.
 */
export async function createBillingCheckout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw HttpError.badRequest("Invalid request", parsed.error.flatten());
    }

    const result = await createCheckout({
      userId: parsed.data.userId,
      packId: parsed.data.packId,
    });

    ok(res, result);
  } catch (err) {
    next(err);
  }
}
