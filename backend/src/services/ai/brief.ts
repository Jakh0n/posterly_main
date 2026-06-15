import { z } from "zod";

import { getOpenAI } from "../../lib/openai";
import { HttpError } from "../../lib/httpError";
import { logger } from "../../utils/logger";

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

const MAX_VISION_ATTEMPTS = 2;

const SYSTEM_PROMPT = `You are a commercial product-photography art director. Your only job is to write a short creative brief describing a tasteful background/scene concept for a generic consumer product advertisement. This is a routine, benign commercial design task.

When a reference image is provided, use it only to gauge the product's general category, colors and shape so the scene complements it. Do not identify people, brands or logos, and do not describe anyone in the image — focus solely on the product and an appropriate advertising backdrop. If the image is unclear, simply infer a plausible generic product from the text and proceed.

Always comply and ALWAYS return valid JSON. Never refuse, never apologize, never return prose.

Return STRICT JSON only (no markdown, no comments) with EXACTLY these keys:
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
- composition MUST leave a large clean area (e.g. the top third) free for headline text.
- negative_prompt MUST always include: text, words, letters, typography, logos, watermarks, signatures, captions.
- Output JSON only.`;

/**
 * Typed error for a model refusal, empty body, or schema/parse miss — i.e. a
 * "soft" failure that is worth retrying or falling back from (vs. a hard
 * network/API error).
 */
class BriefRefusalError extends Error {}

function buildUserText(input: BriefInput, style?: BriefStyle): string {
  const styleLine = style ? `\n\n${STYLE_DIRECTIVES[style]}` : "";
  return `Product name: ${input.productName}\nPrice: ${input.price}\nPromo: ${input.promo}${styleLine}\n\nDesign the advertising brief for this product. JSON only.`;
}

/**
 * Performs a single brief request. When `includeImage` is true the product
 * photo is attached (vision); otherwise it is a text-only request that almost
 * never trips the vision safety filter. Throws `BriefRefusalError` on a soft
 * failure so the caller can retry or fall back.
 */
async function requestBrief(
  input: BriefInput,
  style: BriefStyle | undefined,
  includeImage: boolean,
): Promise<Brief> {
  const openai = getOpenAI();
  const text = buildUserText(input, style);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: includeImage
          ? [
              { type: "text", text },
              { type: "image_url", image_url: { url: input.productImageUrl } },
            ]
          : text,
      },
    ],
  });

  const message = completion.choices[0]?.message;
  const raw = message?.content;
  if (!raw) {
    throw new BriefRefusalError(message?.refusal ?? "empty brief");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new BriefRefusalError("brief was not valid JSON");
  }

  const parsed = briefSchema.safeParse(json);
  if (!parsed.success) {
    throw new BriefRefusalError("brief did not match the required schema");
  }

  return parsed.data;
}

/**
 * Generates a structured creative brief for the product. Vision (with the
 * product photo) is attempted up to `MAX_VISION_ATTEMPTS` times — GPT-4o vision
 * refusals are non-deterministic, so a retry usually succeeds. If vision keeps
 * refusing, it degrades to a text-only brief (no image), which almost never
 * trips the safety filter. Returns strictly-typed JSON validated by `briefSchema`.
 */
export async function generateBrief(
  input: BriefInput,
  style?: BriefStyle,
): Promise<Brief> {
  for (let attempt = 1; attempt <= MAX_VISION_ATTEMPTS; attempt += 1) {
    try {
      return await requestBrief(input, style, true);
    } catch (err) {
      if (err instanceof BriefRefusalError) {
        logger.warn("Brief vision attempt refused; retrying", {
          style,
          attempt,
          reason: err.message,
        });
        continue;
      }
      // Hard error (network/API). Try the text-only path before giving up.
      logger.warn("Brief vision attempt errored; falling back to text-only", {
        style,
        attempt,
        reason: err instanceof Error ? err.message : "unknown",
      });
      break;
    }
  }

  try {
    logger.info("Generating text-only brief fallback", { style });
    return await requestBrief(input, style, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown brief error";
    throw HttpError.internal(`Failed to generate brief: ${message}`);
  }
}

/**
 * Produces briefs for the same product, each varying ONLY the style axis
 * (studio / lifestyle / flat-lay). Runs in parallel and is resilient: a single
 * failing style is logged and skipped rather than failing the whole campaign.
 * Throws only if EVERY style fails (so the campaign can fail + refund).
 */
export async function generateStyledBriefs(
  input: BriefInput,
): Promise<StyledBrief[]> {
  const results = await Promise.allSettled(
    BRIEF_STYLES.map(async (style) => ({
      style,
      brief: await generateBrief(input, style),
    })),
  );

  const briefs: StyledBrief[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      briefs.push(result.value);
    } else {
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : "unknown error";
      logger.error("Brief generation failed for a style", { reason });
    }
  }

  if (briefs.length === 0) {
    throw HttpError.internal("All creative briefs failed to generate");
  }

  return briefs;
}
