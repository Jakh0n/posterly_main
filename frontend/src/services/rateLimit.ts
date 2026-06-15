import { createServerClient } from "@/lib/supabase/server";

/** Max campaigns any user may start within the rolling burst window. */
export const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Hard cap on campaigns a free-tier user may start per rolling 24h. */
export const FREE_TIER_DAILY_CAP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export type UserPlan = "free" | "pro";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

export interface UsageStatus {
  plan: UserPlan;
  /** Campaigns started in the last 24h. */
  dailyUsed: number;
  /** Daily cap for the plan; null means unlimited (paid plans). */
  dailyCap: number | null;
  /** Remaining campaigns today; null when unlimited. */
  remaining: number | null;
  /** True when a free-tier user has hit their daily cap. */
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

async function getUserPlan(
  supabase: ServerClient,
  userId: string,
): Promise<UserPlan> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  return profile?.plan === "pro" ? "pro" : "free";
}

/**
 * Returns the user's plan and free-tier usage against the daily cap. Shared by
 * the rate limiter and the billing page so cap messaging stays consistent.
 * Server-only.
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  const supabase = await createServerClient();
  const plan = await getUserPlan(supabase, userId);

  if (plan !== "free") {
    return {
      plan,
      dailyUsed: 0,
      dailyCap: null,
      remaining: null,
      capReached: false,
    };
  }

  const dailyUsed = await countCampaignsSince(
    supabase,
    userId,
    new Date(Date.now() - DAY_MS),
  );

  return {
    plan,
    dailyUsed,
    dailyCap: FREE_TIER_DAILY_CAP,
    remaining: Math.max(0, FREE_TIER_DAILY_CAP - dailyUsed),
    capReached: dailyUsed >= FREE_TIER_DAILY_CAP,
  };
}

/**
 * Enforces per-user generation throttling and the free-tier hard cap.
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
  if (plan === "free") {
    const daily = await countCampaignsSince(
      supabase,
      userId,
      new Date(Date.now() - DAY_MS),
    );
    if (daily >= FREE_TIER_DAILY_CAP) {
      return {
        allowed: false,
        reason:
          "You've reached the free-tier daily limit. Upgrade to keep creating.",
      };
    }
  }

  return { allowed: true };
}
