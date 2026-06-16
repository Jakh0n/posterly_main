import type { NextFunction, Request, Response } from "express";

import { env } from "../lib/env";
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

function isAllowedAssetUrl(url: string): boolean {
  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  try {
    const parsed = new URL(url);
    const allowed = new URL(base);
    return parsed.origin === allowed.origin && parsed.pathname.startsWith("/");
  } catch {
    return false;
  }
}

/**
 * Proxies a campaign asset download so the browser can save files without R2
 * CORS. Only URLs under our public R2 bucket are allowed.
 */
export async function downloadCampaignAsset(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const url = typeof req.query.url === "string" ? req.query.url : "";
    const filename =
      typeof req.query.filename === "string" ? req.query.filename : "poster.png";

    if (!url || !isAllowedAssetUrl(url)) {
      throw HttpError.badRequest("Invalid asset URL");
    }

    const assetRes = await fetch(url);
    if (!assetRes.ok) {
      throw HttpError.notFound("Asset not found");
    }

    const buffer = Buffer.from(await assetRes.arrayBuffer());
    const contentType = assetRes.headers.get("content-type") ?? "image/png";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/"/g, "")}"`,
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
