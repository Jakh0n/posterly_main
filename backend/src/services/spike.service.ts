import {
  generateBrief,
  generateProductImage,
  uploadProductImage,
  type Brief,
} from "./ai";
import { composeOverlay } from "./overlay";

export interface SpikeInput {
  file: Buffer;
  mimeType: string;
  productName: string;
  price: string;
  promo: string;
}

export interface SpikeResult {
  brief: Brief;
  falImageUrl: string;
  image: string;
}

/**
 * End-to-end spike pipeline:
 * upload -> GPT-4o brief -> fal product-preserving render -> text overlay.
 */
export async function runSpike(input: SpikeInput): Promise<SpikeResult> {
  const productImageUrl = await uploadProductImage(input.file, input.mimeType);

  const brief = await generateBrief({
    productName: input.productName,
    price: input.price,
    promo: input.promo,
    productImageUrl,
  });

  const falImageUrl = await generateProductImage({ productImageUrl, brief });

  const image = await composeOverlay({
    imageUrl: falImageUrl,
    productName: input.productName,
    price: input.price,
    promo: input.promo,
  });

  return { brief, falImageUrl, image };
}
