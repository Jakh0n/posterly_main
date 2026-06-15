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

/**
 * The single controlled axis we vary across the 3 generated variants.
 * Everything else in the brief stays consistent for the product.
 */
export type BriefStyle = "studio" | "lifestyle" | "flat-lay";

export interface StyledBrief {
  style: BriefStyle;
  brief: Brief;
}

const STYLE_DIRECTIVES: Record<BriefStyle, string> = {
  studio:
    "STYLE = STUDIO: a clean seamless studio backdrop, controlled softbox lighting, product on a simple pedestal or surface, crisp commercial catalog look.",
  lifestyle:
    "STYLE = LIFESTYLE: the product in a real, aspirational in-context environment where it would actually be used, natural light, depth and atmosphere.",
  "flat-lay":
    "STYLE = FLAT-LAY: a top-down overhead arrangement on a flat textured surface with tasteful complementary props, even diffuse lighting.",
};

const BRIEF_STYLES: readonly BriefStyle[] = ["studio", "lifestyle", "flat-lay"];

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
 * Returns strictly-typed JSON validated against `briefSchema`. When a `style`
 * is provided it constrains the one controlled axis (studio/lifestyle/flat-lay).
 */
export async function generateBrief(
  input: BriefInput,
  style?: BriefStyle,
): Promise<Brief> {
  try {
    const openai = getOpenAI();

    const styleLine = style ? `\n\n${STYLE_DIRECTIVES[style]}` : "";

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
              text: `Product name: ${input.productName}\nPrice: ${input.price}\nPromo: ${input.promo}${styleLine}\n\nDesign the advertising brief for this exact product. JSON only.`,
            },
            {
              type: "image_url",
              image_url: { url: input.productImageUrl },
            },
          ],
        },
      ],
    });

    const message = completion.choices[0]?.message;
    const raw = message?.content;
    if (!raw) {
      throw HttpError.badRequest(
        message?.refusal
          ? `This photo was declined by the art director: ${message.refusal}`
          : "GPT-4o returned an empty brief. Try a clearer product photo.",
      );
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

/**
 * Produces 3 briefs for the same product, each varying ONLY the style axis
 * (studio / lifestyle / flat-lay). Runs in parallel; fails if any variant fails.
 */
export async function generateStyledBriefs(
  input: BriefInput,
): Promise<StyledBrief[]> {
  const briefs = await Promise.all(
    BRIEF_STYLES.map(async (style) => ({
      style,
      brief: await generateBrief(input, style),
    })),
  );

  return briefs;
}
