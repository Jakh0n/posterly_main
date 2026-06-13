import * as cheerio from "cheerio";
import sharp from "sharp";
import { z } from "zod";

import { getOpenAI } from "../../lib/openai";
import { HttpError } from "../../lib/httpError";

export const brandExtractionSchema = z.object({
  name: z.string().min(1),
  palette: z.array(z.string().regex(/^#([0-9a-fA-F]{6})$/)).min(1).max(6),
  tone: z.string().min(1),
  logo_candidate_url: z.string().url().nullable(),
});

export type BrandExtraction = z.infer<typeof brandExtractionSchema>;

interface ScrapedSignals {
  url: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  themeColor: string | null;
  ogImage: string | null;
  logoCandidate: string | null;
  dominantColor: string | null;
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    throw HttpError.badRequest("Enter a valid store URL");
  }
}

function toAbsolute(base: string, maybeRelative: string | undefined): string | null {
  if (!maybeRelative) {
    return null;
  }
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PosterlyBot/1.0; +https://posterly.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw HttpError.badRequest(`Could not load the page (${res.status})`);
    }
    return await res.text();
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    throw HttpError.badRequest("Could not reach that URL");
  } finally {
    clearTimeout(timeout);
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function getDominantColor(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const { dominant } = await sharp(buffer).stats();
    return rgbToHex(dominant.r, dominant.g, dominant.b);
  } catch {
    return null;
  }
}

function scrapeSignals(html: string, url: string): Omit<ScrapedSignals, "dominantColor"> {
  const $ = cheerio.load(html);

  const meta = (selector: string): string | null =>
    $(selector).attr("content")?.trim() ?? null;

  const ogImage = toAbsolute(url, meta('meta[property="og:image"]') ?? undefined);

  const logoCandidate =
    toAbsolute(url, $('link[rel="apple-touch-icon"]').attr("href")) ??
    toAbsolute(url, $('link[rel="icon"]').attr("href")) ??
    ogImage;

  return {
    url,
    siteName: meta('meta[property="og:site_name"]'),
    title:
      meta('meta[property="og:title"]') ??
      ($("title").first().text().trim() || null),
    description:
      meta('meta[name="description"]') ?? meta('meta[property="og:description"]'),
    themeColor: meta('meta[name="theme-color"]'),
    ogImage,
    logoCandidate,
  };
}

const SYSTEM_PROMPT = `You are a brand analyst. Given raw signals scraped from a store's homepage, infer a concise brand profile.

Return STRICT JSON only (no markdown, no prose) with EXACTLY these keys:
{
  "name": string,                 // the brand/store name
  "palette": string[],            // 3-5 hex colors (e.g. "#1a2b3c") representing the brand
  "tone": string,                 // short description of the brand voice (e.g. "Playful and bold")
  "logo_candidate_url": string|null // best logo image URL from the signals, or null
}

Rules:
- palette MUST be 3-5 valid 6-digit hex codes. Seed it from any provided colors, then complete a cohesive palette.
- If a signal is missing, infer sensibly from the name/description/domain.
- Output JSON only.`;

/**
 * Scrapes a store URL and normalizes it into a structured brand profile
 * using GPT-4o. Returns strictly-validated JSON.
 */
export async function extractBrandFromUrl(rawUrl: string): Promise<BrandExtraction> {
  const url = normalizeUrl(rawUrl);
  const html = await fetchText(url);
  const scraped = scrapeSignals(html, url);
  const dominantColor = await getDominantColor(scraped.ogImage ?? scraped.logoCandidate);

  const signals: ScrapedSignals = { ...scraped, dominantColor };

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Scraped signals (JSON):\n${JSON.stringify(signals, null, 2)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw HttpError.internal("GPT-4o returned an empty brand profile");
    }

    const parsed = brandExtractionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw HttpError.internal("Brand profile did not match the required schema");
    }

    // Prefer a real scraped logo over a hallucinated URL.
    return {
      ...parsed.data,
      logo_candidate_url: signals.logoCandidate ?? parsed.data.logo_candidate_url,
    };
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown extract error";
    throw HttpError.internal(`Failed to extract brand: ${message}`);
  }
}
