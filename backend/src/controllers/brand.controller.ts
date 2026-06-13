import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { ok } from "../lib/api";
import { HttpError } from "../lib/httpError";
import { extractBrandFromUrl } from "../services/brand";
import { uploadObject } from "../services/storage";

const extractSchema = z.object({
  url: z.string().min(1, "A store URL is required"),
});

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

export async function extractBrand(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = extractSchema.safeParse(req.body);
    if (!parsed.success) {
      throw HttpError.badRequest("Invalid request", parsed.error.flatten());
    }

    const brand = await extractBrandFromUrl(parsed.data.url);
    ok(res, brand);
  } catch (err) {
    next(err);
  }
}

export async function uploadLogo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw HttpError.badRequest("A logo file is required (field 'logo')");
    }

    if (!ALLOWED_LOGO_MIME.has(req.file.mimetype)) {
      throw HttpError.badRequest("Logo must be PNG, JPEG, WebP or SVG");
    }

    const result = await uploadObject(
      req.file.buffer,
      req.file.mimetype,
      "brands/logos",
    );

    ok(res, { url: result.url });
  } catch (err) {
    next(err);
  }
}
