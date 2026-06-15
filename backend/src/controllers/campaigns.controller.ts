import type { NextFunction, Request, Response } from "express";

import { ok } from "../lib/api";
import { HttpError } from "../lib/httpError";
import { uploadObject } from "../services/storage";

const ALLOWED_PHOTO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

/**
 * Uploads a product photo to R2 and returns its public URL. The server action
 * persists this URL on the campaign row before enqueuing generation.
 */
export async function uploadProductPhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw HttpError.badRequest("A product photo is required (field 'photo')");
    }

    if (!ALLOWED_PHOTO_MIME.has(req.file.mimetype)) {
      throw HttpError.badRequest("Photo must be PNG, JPEG or WebP");
    }

    const result = await uploadObject(
      req.file.buffer,
      req.file.mimetype,
      "campaigns/products",
    );

    ok(res, { url: result.url });
  } catch (err) {
    next(err);
  }
}
