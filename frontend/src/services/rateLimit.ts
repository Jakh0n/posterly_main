import { createServerClient } from "@/lib/supabase/server";

/** Max campaigns any user may start within the rolling window. */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Hard cap on campaigns a free-tier user may start per rolling 24h. */
const FREE_TIER_DAILY_CAP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

async function countCampaignsSince(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  const plan = profile?.plan ?? "free";
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
