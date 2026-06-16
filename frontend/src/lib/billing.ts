export type BillingPackId =
  | "credits_s"
  | "credits_m"
  | "credits_l"
  | "lite"
  | "pro"
  | "studio";

export type BillingKind = "one_time" | "subscription";

export type SubscriptionPlan = "lite" | "pro" | "studio";

export type UserPlan = "free" | SubscriptionPlan;

export const VARIANTS_PER_CAMPAIGN = 3;
export const SIGNUP_BONUS_CREDITS = 3;
export const FREE_TIER_DAILY_CAP = 2;
export const PAID_TIER_DAILY_CAP = 15;

export interface BillingPackDisplay {
  id: BillingPackId;
  name: string;
  description: string;
  kind: BillingKind;
  credits: number;
  priceUsd: number;
  highlighted?: boolean;
}

function campaignOutcome(credits: number): string {
  return `${credits} campaigns · ${credits * VARIANTS_PER_CAMPAIGN} posters`;
}

/**
 * Display catalog for the billing page. Credit amounts and prices mirror the
 * authoritative backend catalog; the backend remains the source of truth for
 * how many credits a payment grants (via checkout metadata).
 */
export const BILLING_PACKS: readonly BillingPackDisplay[] = [
  {
    id: "credits_s",
    name: "Starter",
    description: campaignOutcome(25),
    kind: "one_time",
    credits: 25,
    priceUsd: 12,
  },
  {
    id: "credits_m",
    name: "Campaign",
    description: campaignOutcome(65),
    kind: "one_time",
    credits: 65,
    priceUsd: 29,
    highlighted: true,
  },
  {
    id: "credits_l",
    name: "Event",
    description: campaignOutcome(140),
    kind: "one_time",
    credits: 140,
    priceUsd: 59,
  },
  {
    id: "lite",
    name: "Lite",
    description: `${campaignOutcome(50)} / month · ${PAID_TIER_DAILY_CAP} campaigns/day`,
    kind: "subscription",
    credits: 50,
    priceUsd: 19,
  },
  {
    id: "pro",
    name: "Pro",
    description: `${campaignOutcome(120)} / month · ${PAID_TIER_DAILY_CAP} campaigns/day`,
    kind: "subscription",
    credits: 120,
    priceUsd: 39,
    highlighted: true,
  },
  {
    id: "studio",
    name: "Studio",
    description: `${campaignOutcome(250)} / month · ${PAID_TIER_DAILY_CAP} campaigns/day`,
    kind: "subscription",
    credits: 250,
    priceUsd: 79,
  },
] as const;

export function formatCampaignOutcome(credits: number): string {
  return campaignOutcome(credits);
}

export function isPaidPlan(plan: string | null | undefined): plan is SubscriptionPlan {
  return plan === "lite" || plan === "pro" || plan === "studio";
}

export const PLAN_LABEL: Record<UserPlan, string> = {
  free: "Free",
  lite: "Lite",
  pro: "Pro",
  studio: "Studio",
};

/** Shown on free-tier exports and previews. */
export const WATERMARK_LABEL = "Posterly";
