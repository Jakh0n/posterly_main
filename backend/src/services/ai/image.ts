import { getFal } from "../../lib/fal";
import { HttpError } from "../../lib/httpError";
import type { Brief } from "./brief";

const FAL_MODEL = "fal-ai/bria/product-shot";

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
 * Generates a lifestyle ad image while preserving the real uploaded product
 * (Bria product-shot keeps the product and only synthesises the scene).
 * Returns the URL of the generated image.
 */
export async function generateProductImage(
  input: ProductImageInput,
): Promise<string> {
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
