import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { ok } from "../lib/api";
import { HttpError } from "../lib/httpError";
import { runSpike } from "../services/spike.service";

const bodySchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  price: z.string().min(1, "Price is required"),
  promo: z.string().min(1, "Promo is required"),
});

export async function spikeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw HttpError.badRequest("A product photo is required (field 'photo')");
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw HttpError.badRequest("Invalid form fields", parsed.error.flatten());
    }

    const result = await runSpike({
      file: req.file.buffer,
      mimeType: req.file.mimetype,
      productName: parsed.data.productName,
      price: parsed.data.price,
      promo: parsed.data.promo,
    });

    ok(res, result);
  } catch (err) {
    next(err);
  }
}
