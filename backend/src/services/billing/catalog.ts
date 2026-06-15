import { env } from "../../lib/env";

export type BillingPackId = "credits_s" | "credits_m" | "credits_l" | "pro";

export type BillingKind = "one_time" | "subscription";

export interface BillingPack {
  id: BillingPackId;
  name: string;
  description: string;
  kind: BillingKind;
  credits: number;
  priceUsd: number;
  /** Polar product id; empty until billing is configured. */
  productId: string;
}

/**
 * Authoritative billing catalog. `credits` is the number of credits granted on
 * a successful payment; it is also written into the checkout metadata so the
 * webhook can credit the user without re-deriving it from the product id.
 */
export const BILLING_PACKS: readonly BillingPack[] = [
  {
    id: "credits_s",
    name: "Starter pack",
    description: "50 generation credits",
    kind: "one_time",
    credits: 50,
    priceUsd: 9,
    productId: env.POLAR_PRODUCT_CREDITS_S ?? "",
  },
  {
    id: "credits_m",
    name: "Studio pack",
    description: "150 generation credits",
    kind: "one_time",
    credits: 150,
    priceUsd: 19,
    productId: env.POLAR_PRODUCT_CREDITS_M ?? "",
  },
  {
    id: "credits_l",
    name: "Scale pack",
    description: "500 generation credits",
    kind: "one_time",
    credits: 500,
    priceUsd: 49,
    productId: env.POLAR_PRODUCT_CREDITS_L ?? "",
  },
  {
    id: "pro",
    name: "Pro",
    description: "300 credits / month + no daily limit",
    kind: "subscription",
    credits: 300,
    priceUsd: 29,
    productId: env.POLAR_PRODUCT_PRO ?? "",
  },
] as const;

export function getPack(id: string): BillingPack | undefined {
  return BILLING_PACKS.find((pack) => pack.id === id);
}
