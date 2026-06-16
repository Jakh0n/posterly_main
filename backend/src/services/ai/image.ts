import sharp from "sharp";
import { toFile } from "openai";

import { env } from "../../lib/env";
import { getOpenAI } from "../../lib/openai";
import { HttpError } from "../../lib/httpError";
import { uploadObject } from "../storage";
import type { Brief } from "./brief";

const IMAGE_MODEL = "gpt-image-1";
const IMAGE_SIZE = "1024x1024";

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;
const FALLBACK_PALETTE = ["#0f172a", "#334155"] as const;

/** When true, renders a local placeholder instead of calling OpenAI. Dev/test only. */
function isMockEnabled(): boolean {
  return env.MOCK_GENERATION;
}

export interface ProductImageInput {
  productImageUrl: string;
  brief: Brief;
}

/**
 * Builds the image-edit prompt from the brief's structured fields only.
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
    "preserve the uploaded product exactly as shown",
    "no text, no logos, no watermarks, no captions",
  ].join(". ");
}

/**
 * Renders a product-preserving placeholder: the real uploaded product centered
 * over a gradient derived from the brief's palette. Used when MOCK_GENERATION is
 * enabled so the full pipeline can run locally without a paid image call.
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
 * Generates a lifestyle ad scene around the uploaded product via OpenAI
 * gpt-image-1 (images.edit). Returns the public URL of the scene image.
 */
export async function generateProductImage(
  input: ProductImageInput,
): Promise<string> {
  if (isMockEnabled()) {
    return generateMockProductImage(input);
  }

  try {
    const openai = getOpenAI();
    const res = await fetch(input.productImageUrl);
    if (!res.ok) {
      throw HttpError.internal(`Failed to fetch product image (${res.status})`);
    }
    const productBuffer = Buffer.from(await res.arrayBuffer());
    const productFile = await toFile(productBuffer, "product.png", {
      type: "image/png",
    });

    const result = await openai.images.edit({
      model: IMAGE_MODEL,
      image: productFile,
      prompt: buildSceneDescription(input.brief),
      size: IMAGE_SIZE,
      quality: "medium",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw HttpError.internal("OpenAI returned no image data");
    }

    const png = Buffer.from(b64, "base64");
    const { url } = await uploadObject(png, "image/png", "campaigns/scenes");
    return url;
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown image error";
    throw HttpError.internal(`Failed to generate product image: ${message}`);
  }
}
