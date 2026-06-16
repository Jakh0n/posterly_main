import type { NextFunction, Request, Response } from "express";

import { getUserFromRequest } from "../lib/auth";
import { ok } from "../lib/api";
import { env } from "../lib/env";
import { HttpError } from "../lib/httpError";
import { isPaidPlan } from "../services/billing/catalog";
import { createServerClient } from "../lib/supabase";
import { uploadObject } from "../services/storage";
import { applyWatermark } from "../services/watermark";

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

const CAMPAIGN_ID_IN_PATH =
  /\/campaigns\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i;

function extractCampaignIdFromAssetUrl(url: string): string | null {
  try {
    return url.match(CAMPAIGN_ID_IN_PATH)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function assertUserOwnsCampaignAsset(
  userId: string,
  assetUrl: string,
): Promise<void> {
  const campaignId = extractCampaignIdFromAssetUrl(assetUrl);
  if (!campaignId) {
    throw HttpError.badRequest("Invalid asset URL");
  }

  const supabase = createServerClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (campaignError || !campaign) {
    throw HttpError.forbidden("You do not have access to this asset");
  }

  const { data: creative, error: creativeError } = await supabase
    .from("creatives")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("final_url", assetUrl)
    .maybeSingle();

  if (creativeError || !creative) {
    throw HttpError.notFound("Asset not found");
  }
}

async function userNeedsWatermark(userId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw HttpError.internal("Could not verify plan");
  }

  return !isPaidPlan(profile?.plan);
}

/**
 * Proxies a campaign asset download so the browser can save files without R2
 * CORS. Requires auth; free-tier exports include a Posterly watermark.
 */
export async function downloadCampaignAsset(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      throw HttpError.unauthorized("Sign in to download posters");
    }

    const url = typeof req.query.url === "string" ? req.query.url : "";
    const filename =
      typeof req.query.filename === "string" ? req.query.filename : "poster.png";

    if (!url || !isAllowedAssetUrl(url)) {
      throw HttpError.badRequest("Invalid asset URL");
    }

    await assertUserOwnsCampaignAsset(user.id, url);

    const assetRes = await fetch(url);
    if (!assetRes.ok) {
      throw HttpError.notFound("Asset not found");
    }

    let output = Buffer.from(await assetRes.arrayBuffer());
    const contentType = assetRes.headers.get("content-type") ?? "image/png";

    if (await userNeedsWatermark(user.id)) {
      output = Buffer.from(await applyWatermark(output));
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/"/g, "")}"`,
    );
    res.send(output);
  } catch (err) {
    next(err);
  }
}
