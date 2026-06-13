import { z } from "zod";

import { getOpenAI } from "../../lib/openai";
import { HttpError } from "../../lib/httpError";

export const briefSchema = z.object({
  scene: z.string().min(1),
  lighting: z.string().min(1),
  color_palette: z.array(z.string().min(1)).min(1),
  mood: z.string().min(1),
  composition: z.string().min(1),
  camera: z.string().min(1),
  negative_prompt: z.string().min(1),
});

export type Brief = z.infer<typeof briefSchema>;

export interface BriefInput {
  productName: string;
  price: string;
  promo: string;
  productImageUrl: string;
}

const SYSTEM_PROMPT = `You are a senior advertising art director. Given a product photo and basic copy, design a single hero advertising shot for THAT specific product.

Return STRICT JSON only (no markdown, no prose, no comments) with EXACTLY these keys:
{
  "scene": string,            // concrete physical setting/background for the product
  "lighting": string,         // lighting setup and direction
  "color_palette": string[],  // 3-5 hex codes or precise color names
  "mood": string,             // the emotional tone
  "composition": string,      // framing/layout; MUST reserve generous empty negative space for headline text
  "camera": string,           // lens, angle, depth of field
  "negative_prompt": string   // things to avoid; MUST explicitly forbid any text, words, letters, typography, logos, watermarks, signatures, captions in the image
}

Rules:
- The scene must plausibly contain and flatter the real product in the photo.
- composition MUST leave a large clean area (e.g. top third) free for text overlay.
- negative_prompt MUST always include: text, words, letters, typography, logos, watermarks, signatures, captions.
- Output JSON only.`;

/**
 * Generates a structured creative brief for the product using GPT-4o vision.
 * Returns strictly-typed JSON validated against `briefSchema`.
 */
export async function generateBrief(input: BriefInput): Promise<Brief> {
  try {
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Product name: ${input.productName}\nPrice: ${input.price}\nPromo: ${input.promo}\n\nDesign the advertising brief for this exact product. JSON only.`,
            },
            {
              type: "image_url",
              image_url: { url: input.productImageUrl },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw HttpError.internal("GPT-4o returned an empty brief");
    }

    const parsed = briefSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw HttpError.internal("GPT-4o brief did not match the required schema");
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown brief error";
    throw HttpError.internal(`Failed to generate brief: ${message}`);
  }
}
