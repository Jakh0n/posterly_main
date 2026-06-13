import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex color, e.g. #1a2b3c");

export const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(80),
  tone: z.string().max(120).optional().default(""),
  palette: z.array(hexColor).min(1, "Add at least one color").max(6),
  logoUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
});

export type BrandSchemaValues = z.infer<typeof brandSchema>;
