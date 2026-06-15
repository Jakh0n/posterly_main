import sharp from "sharp";

import { env } from "../../lib/env";
import { getFal } from "../../lib/fal";
import { HttpError } from "../../lib/httpError";
import { uploadObject } from "../storage";
import type { Brief } from "./brief";

const FAL_MODEL = "fal-ai/bria/product-shot";

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;
const FALLBACK_PALETTE = ["#0f172a", "#334155"] as const;

/**
 * Whether to skip the real fal call and render a local placeholder instead.
 * Enabled explicitly via MOCK_GENERATION, or implicitly when no real fal key
 * is configured (so the pipeline stays runnable in development).
 */
function isMockEnabled(): boolean {
  return env.MOCK_GENERATION || env.FAL_KEY.trim().toLowerCase() === "dummy";
}

export interface ProductImageInput {
  productImageUrl: string;
  brief: Brief;
}

interface BriaImage {
  url: string;
}

interface BriaResult {
  images?: BriaImage[];
}

/**
 * Uploads the raw product photo to fal storage and returns its public URL.
 */
export async function uploadProductImage(
  file: Buffer,
  mimeType: string,
): Promise<string> {
  try {
    const fal = getFal();
    const blob = new Blob([new Uint8Array(file)], { type: mimeType });
    return await fal.storage.upload(blob);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    throw HttpError.internal(`Failed to upload product image: ${message}`);
  }
}

/**
 * Builds the fal scene description from the brief's structured fields only.
 * Raw GPT prose is never forwarded — every field is composed deliberately.
 */
function buildSceneDescription(brief: Brief): string {
  return [
    brief.scene,
    brief.lighting,
    `color palette: ${brief.color_palette.join(", ")}`,
    `mood: ${brief.mood}`,
    `${brief.composition}, with generous empty negative space reserved for headline text`,
    `shot on ${brief.camera}`,
    "clean professional advertising product photograph",
    "no text, no logos, no watermarks, no captions",
  ].join(". ");
}

/**
 * Renders a product-preserving placeholder: the real uploaded product centered
 * over a gradient derived from the brief's palette. Used when fal is not
 * configured so the full pipeline (and its tests) can run locally.
 * Returns the public URL of the uploaded placeholder.
 */
async function generateMockProductImage(
  input: ProductImageInput,
): Promise<string> {
  try {
    const size = 1000;
    const palette = input.brief.color_palette.filter((c) => HEX_COLOR.test(c));
    const [from, to] = [
      palette[0] ?? FALLBACK_PALETTE[0],
      palette[1] ?? palette[0] ?? FALLBACK_PALETTE[1],
    ];

    const gradientSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${from}"/>
            <stop offset="100%" stop-color="${to}"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#g)"/>
      </svg>`,
    );

    const res = await fetch(input.productImageUrl);
    if (!res.ok) {
      throw HttpError.internal(`Failed to fetch product image (${res.status})`);
    }
    const productBuffer = Buffer.from(await res.arrayBuffer());

    const product = await sharp(productBuffer)
      .resize({ width: Math.round(size * 0.62), withoutEnlargement: true })
      .png()
      .toBuffer();
    const productMeta = await sharp(product).metadata();
    const productHeight = productMeta.height ?? Math.round(size * 0.62);

    const composed = await sharp(gradientSvg)
      .composite([
        {
          input: product,
          top: size - productHeight - Math.round(size * 0.08),
          left: Math.round((size - (productMeta.width ?? size * 0.62)) / 2),
        },
      ])
      .png()
      .toBuffer();

    const { url } = await uploadObject(composed, "image/png", "campaigns/mock");
    return url;
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown mock error";
    throw HttpError.internal(`Failed to render mock product image: ${message}`);
  }
}

/**
 * Generates a lifestyle ad image while preserving the real uploaded product
 * (Bria product-shot keeps the product and only synthesises the scene).
 * Returns the URL of the generated image.
 */
export async function generateProductImage(
  input: ProductImageInput,
): Promise<string> {
  if (isMockEnabled()) {
    return generateMockProductImage(input);
  }

  try {
    const fal = getFal();

    const result = await fal.subscribe(FAL_MODEL, {
      input: {
        image_url: input.productImageUrl,
        scene_description: buildSceneDescription(input.brief),
        placement_type: "manual_placement",
        manual_placement_selection: "bottom_center",
        num_results: 1,
        fast: true,
        sync_mode: true,
        shot_size: [1000, 1000],
      },
    });

    const data = result.data as BriaResult;
    const url = data.images?.[0]?.url;
    if (!url) {
      throw HttpError.internal("fal.ai returned no product image");
    }

    return url;
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown image error";
    throw HttpError.internal(`Failed to generate product image: ${message}`);
  }
}
