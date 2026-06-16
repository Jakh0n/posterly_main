import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import sharp from "sharp";

import { HttpError } from "../lib/httpError";

export interface RenderOverlayInput {
  baseImage: Buffer;
  productName: string;
  price: string;
  promo: string;
  logoUrl?: string | null;
}

interface FontSet {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}

type StyleMap = Record<string, string | number>;

interface SatoriNode {
  type: string;
  props: {
    style?: StyleMap;
    children?: SatoriNode | SatoriNode[] | string;
  };
}

const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
  bold: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf",
} as const;

let fontCache: Promise<FontSet> | null = null;

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch font (${res.status}): ${url}`);
  }
  return res.arrayBuffer();
}

function loadFonts(): Promise<FontSet> {
  if (!fontCache) {
    fontCache = Promise.all([
      fetchFont(FONT_URLS.regular),
      fetchFont(FONT_URLS.bold),
    ]).then(([regular, bold]) => ({ regular, bold }));
  }
  return fontCache;
}

interface OverlayText {
  productName: string;
  price: string;
  promo: string;
}

function buildMarkup(input: OverlayText, width: number): SatoriNode {
  const scale = width / 1000;

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: `${56 * scale}px`,
        fontFamily: "Inter",
        backgroundImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0) 40%)",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex" },
            children: {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontSize: `${26 * scale}px`,
                  fontWeight: 700,
                  padding: `${10 * scale}px ${22 * scale}px`,
                  borderRadius: `${999}px`,
                },
                children: input.promo,
              },
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              marginTop: `${24 * scale}px`,
              maxWidth: "72%",
              color: "#ffffff",
              fontSize: `${82 * scale}px`,
              fontWeight: 700,
              lineHeight: 1.05,
              textShadow: "0 2px 18px rgba(0,0,0,0.55)",
            },
            children: input.productName,
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              marginTop: `${16 * scale}px`,
              color: "#ffffff",
              fontSize: `${54 * scale}px`,
              fontWeight: 700,
              textShadow: "0 2px 14px rgba(0,0,0,0.55)",
            },
            children: input.price,
          },
        },
      ],
    },
  };
}

/**
 * Builds a logo composite (top-right) from a logo URL. Returns null and never
 * throws when the logo can't be fetched — a missing logo must not fail a render.
 */
async function buildLogoComposite(
  logoUrl: string,
  canvasWidth: number,
): Promise<sharp.OverlayOptions | null> {
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) {
      return null;
    }

    const logoBuffer = Buffer.from(await res.arrayBuffer());
    const targetWidth = Math.round(canvasWidth * 0.14);
    const margin = Math.round(canvasWidth * 0.05);

    const resized = await sharp(logoBuffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .png()
      .toBuffer();

    return { input: resized, top: margin, left: canvasWidth - targetWidth - margin };
  } catch {
    return null;
  }
}

/**
 * Renders the name/price/promo (and optional logo) over a base image buffer.
 * Pipeline: satori (SVG) -> resvg (PNG) -> sharp (composite). No node-canvas.
 * Returns a PNG buffer ready to persist.
 */
export async function renderOverlay(input: RenderOverlayInput): Promise<Buffer> {
  try {
    const metadata = await sharp(input.baseImage).metadata();
    const width = metadata.width ?? 1000;
    const height = metadata.height ?? 1000;

    const fonts = await loadFonts();
    const markup = buildMarkup(input, width);

    const svg = await satori(markup as Parameters<typeof satori>[0], {
      width,
      height,
      fonts: [
        { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
      ],
    });

    const overlayPng = new Resvg(svg, {
      fitTo: { mode: "original" },
      background: "rgba(0,0,0,0)",
    })
      .render()
      .asPng();

    const composites: sharp.OverlayOptions[] = [
      { input: overlayPng, top: 0, left: 0 },
    ];

    if (input.logoUrl) {
      const logo = await buildLogoComposite(input.logoUrl, width);
      if (logo) {
        composites.push(logo);
      }
    }

    return await sharp(input.baseImage).composite(composites).png().toBuffer();
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown overlay error";
    throw HttpError.internal(`Failed to render overlay: ${message}`);
  }
}
