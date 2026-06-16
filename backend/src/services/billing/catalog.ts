import { env } from "../../lib/env";

export type BillingPackId =
  | "credits_s"
  | "credits_m"
  | "credits_l"
  | "lite"
  | "pro"
  | "studio";

export type BillingKind = "one_time" | "subscription";

/** Paid subscription tiers stored on profiles.plan */
export type SubscriptionPlan = "lite" | "pro" | "studio";

export type UserPlan = "free" | SubscriptionPlan;

export const VARIANTS_PER_CAMPAIGN = 3;
export const SIGNUP_BONUS_CREDITS = 3;
export const FREE_TIER_DAILY_CAP = 2;
export const PAID_TIER_DAILY_CAP = 15;

export interface BillingPack {
  id: BillingPackId;
  name: string;
  description: string;
  kind: BillingKind;
  credits: number;
  priceUsd: number;
  /** Polar product id; empty until billing is configured. */
  productId: string;
  highlighted?: boolean;
}

function campaignOutcome(credits: number): string {
  return `${credits} campaigns · ${credits * VARIANTS_PER_CAMPAIGN} posters`;
}

/**
 * Authoritative billing catalog. `credits` is the number of credits granted on
 * a successful payment; it is also written into the checkout metadata so the
 * webhook can credit the user without re-deriving it from the product id.
 */
export const BILLING_PACKS: readonly BillingPack[] = [
  {
    id: "credits_s",
    name: "Starter",
    description: campaignOutcome(25),
    kind: "one_time",
    credits: 25,
    priceUsd: 12,
    productId: env.POLAR_PRODUCT_CREDITS_S ?? "",
  },
  {
    id: "credits_m",
    name: "Campaign",
    description: campaignOutcome(65),
    kind: "one_time",
    credits: 65,
    priceUsd: 29,
    highlighted: true,
    productId: env.POLAR_PRODUCT_CREDITS_M ?? "",
  },
  {
    id: "credits_l",
    name: "Event",
    description: campaignOutcome(140),
    kind: "one_time",
    credits: 140,
    priceUsd: 59,
    productId: env.POLAR_PRODUCT_CREDITS_L ?? "",
  },
  {
    id: "lite",
    name: "Lite",
    description: `${campaignOutcome(50)} / month · ${PAID_TIER_DAILY_CAP} campaigns/day`,
    kind: "subscription",
    credits: 50,
    priceUsd: 19,
    productId: env.POLAR_PRODUCT_LITE ?? "",
  },
  {
    id: "pro",
    name: "Pro",
    description: `${campaignOutcome(120)} / month · ${PAID_TIER_DAILY_CAP} campaigns/day`,
    kind: "subscription",
    credits: 120,
    priceUsd: 39,
    highlighted: true,
    productId: env.POLAR_PRODUCT_PRO ?? "",
  },
  {
    id: "studio",
    name: "Studio",
    description: `${campaignOutcome(250)} / month · ${PAID_TIER_DAILY_CAP} campaigns/day`,
    kind: "subscription",
    credits: 250,
    priceUsd: 79,
    productId: env.POLAR_PRODUCT_STUDIO ?? "",
  },
] as const;

export function getPack(id: string): BillingPack | undefined {
  return BILLING_PACKS.find((pack) => pack.id === id);
}

/** Maps a subscription checkout pack id to the profile plan tier. */
export function planFromPackId(packId: string | undefined): SubscriptionPlan {
  const pack = packId ? getPack(packId) : undefined;
  if (
    pack?.kind === "subscription" &&
    (pack.id === "lite" || pack.id === "pro" || pack.id === "studio")
  ) {
    return pack.id;
  }
  return "pro";
}

export function isPaidPlan(plan: string | null | undefined): plan is SubscriptionPlan {
  return plan === "lite" || plan === "pro" || plan === "studio";
}
