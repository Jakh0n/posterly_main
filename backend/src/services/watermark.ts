import sharp from "sharp";

export const WATERMARK_LABEL = "Posterly";

/**
 * Applies a diagonal repeat + corner badge so free-tier exports are usable for
 * previews but not production-ready without upgrading.
 */
export async function applyWatermark(image: Buffer): Promise<Buffer> {
  const metadata = await sharp(image).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;
  const badgeWidth = Math.round(width * 0.22);
  const badgeHeight = Math.round(height * 0.055);
  const badgeX = width - badgeWidth - Math.round(width * 0.03);
  const badgeY = height - badgeHeight - Math.round(height * 0.03);
  const fontSize = Math.max(14, Math.round(width * 0.022));
  const patternFontSize = Math.max(18, Math.round(width * 0.028));

  const watermarkSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wm" patternUnits="userSpaceOnUse" width="320" height="200" patternTransform="rotate(-32)">
          <text x="0" y="120" font-family="Arial, Helvetica, sans-serif" font-size="${patternFontSize}" font-weight="700" fill="rgba(255,255,255,0.2)">${WATERMARK_LABEL}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)"/>
      <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="8" fill="rgba(0,0,0,0.5)"/>
      <text x="${badgeX + badgeWidth / 2}" y="${badgeY + badgeHeight * 0.68}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${WATERMARK_LABEL}</text>
    </svg>`,
  );

  return sharp(image)
    .composite([{ input: watermarkSvg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
