import { z } from "zod";

export const createCampaignSchema = z.object({
  productName: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(120, "Product name is too long"),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .max(40, "Price is too long"),
  promo: z
    .string()
    .trim()
    .min(1, "Promo text is required")
    .max(60, "Promo is too long"),
  productImageUrl: z
    .string()
    .url("Upload a product photo before submitting"),
  brandId: z.string().uuid().nullable().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
