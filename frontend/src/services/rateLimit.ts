import { createServerClient } from "@/lib/supabase/server";
import {
  FREE_TIER_DAILY_CAP,
  PAID_TIER_DAILY_CAP,
  isPaidPlan,
  type UserPlan,
} from "@/lib/billing";

export type { UserPlan };

/** Max campaigns any user may start within the rolling burst window. */
export const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export { FREE_TIER_DAILY_CAP, PAID_TIER_DAILY_CAP };

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

export interface UsageStatus {
  plan: UserPlan;
  /** Campaigns started in the last 24h. */
  dailyUsed: number;
  /** Daily cap for the plan; null should not occur (all plans are capped). */
  dailyCap: number;
  /** Remaining campaigns today. */
  remaining: number;
  /** True when the user has hit their daily cap. */
  capReached: boolean;
}

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

async function countCampaignsSince(
  supabase: ServerClient,
  userId: string,
  since: Date,
): Promise<number> {
  const { count, error } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function dailyCapForPlan(plan: UserPlan): number {
  return plan === "free" ? FREE_TIER_DAILY_CAP : PAID_TIER_DAILY_CAP;
}

async function getUserPlan(
  supabase: ServerClient,
  userId: string,
): Promise<UserPlan> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  const plan = profile?.plan;
  return isPaidPlan(plan) ? plan : "free";
}

/**
 * Returns the user's plan and usage against their daily cap. Shared by the
 * rate limiter and the billing page so cap messaging stays consistent.
 * Server-only.
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  const supabase = await createServerClient();
  const plan = await getUserPlan(supabase, userId);
  const dailyCap = dailyCapForPlan(plan);

  const dailyUsed = await countCampaignsSince(
    supabase,
    userId,
    new Date(Date.now() - DAY_MS),
  );

  return {
    plan,
    dailyUsed,
    dailyCap,
    remaining: Math.max(0, dailyCap - dailyUsed),
    capReached: dailyUsed >= dailyCap,
  };
}

/**
 * Enforces per-user generation throttling and the plan daily cap.
 * RLS-scoped: each user can only ever count their own campaigns. Server-only.
 */
export async function checkGenerationRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  const supabase = await createServerClient();

  const recent = await countCampaignsSince(
    supabase,
    userId,
    new Date(Date.now() - RATE_LIMIT_WINDOW_MS),
  );
  if (recent >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      reason: "You're generating too quickly. Try again in a minute.",
    };
  }

  const plan = await getUserPlan(supabase, userId);
  const dailyCap = dailyCapForPlan(plan);
  const daily = await countCampaignsSince(
    supabase,
    userId,
    new Date(Date.now() - DAY_MS),
  );

  if (daily >= dailyCap) {
    const upgradeHint =
      plan === "free"
        ? "Upgrade to keep creating."
        : "You've hit today's limit. Try again tomorrow or buy a credit pack.";
    return {
      allowed: false,
      reason: `You've reached your daily limit of ${dailyCap} campaigns. ${upgradeHint}`,
    };
  }

  return { allowed: true };
}
