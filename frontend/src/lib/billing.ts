export type BillingPackId = "credits_s" | "credits_m" | "credits_l" | "pro";

export type BillingKind = "one_time" | "subscription";

export interface BillingPackDisplay {
  id: BillingPackId;
  name: string;
  description: string;
  kind: BillingKind;
  credits: number;
  priceUsd: number;
  highlighted?: boolean;
}

/**
 * Display catalog for the billing page. Credit amounts and prices mirror the
 * authoritative backend catalog; the backend remains the source of truth for
 * how many credits a payment grants (via checkout metadata).
 */
export const BILLING_PACKS: readonly BillingPackDisplay[] = [
  {
    id: "credits_s",
    name: "Starter pack",
    description: "One-time top-up for quick campaigns.",
    kind: "one_time",
    credits: 50,
    priceUsd: 9,
  },
  {
    id: "credits_m",
    name: "Studio pack",
    description: "Best value for regular creators.",
    kind: "one_time",
    credits: 150,
    priceUsd: 19,
    highlighted: true,
  },
  {
    id: "credits_l",
    name: "Scale pack",
    description: "Stock up for high-volume launches.",
    kind: "one_time",
    credits: 500,
    priceUsd: 49,
  },
  {
    id: "pro",
    name: "Pro",
    description: "300 credits monthly and no daily limit.",
    kind: "subscription",
    credits: 300,
    priceUsd: 29,
  },
] as const;
