import { createServerClient } from "../../lib/supabase";
import { logger } from "../../utils/logger";

type Supabase = ReturnType<typeof createServerClient>;

/**
 * Appends purchased credits to the ledger, idempotently keyed by the Polar
 * order id. A repeated webhook delivery for the same order is a no-op, so the
 * user is never double-credited. Returns true if a new grant was written.
 */
export async function grantPurchasedCredits(
  userId: string,
  credits: number,
  orderId: string,
): Promise<boolean> {
  if (credits <= 0) {
    return false;
  }

  const supabase: Supabase = createServerClient();

  const { data: existing, error: selectError } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", "purchase")
    .eq("ref_id", orderId)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to check existing grant: ${selectError.message}`);
  }
  if (existing) {
    logger.info("Skipping duplicate credit grant", { orderId, userId });
    return false;
  }

  const { error: insertError } = await supabase
    .from("credit_transactions")
    .insert({
      user_id: userId,
      delta: credits,
      reason: "purchase",
      ref_id: orderId,
    });

  if (insertError) {
    throw new Error(`Failed to grant credits: ${insertError.message}`);
  }

  logger.info("Granted purchased credits", { orderId, userId, credits });
  return true;
}

/**
 * Sets the user's plan on their profile (e.g. 'pro' or 'free').
 */
export async function setUserPlan(
  userId: string,
  plan: "free" | "pro",
): Promise<void> {
  const supabase: Supabase = createServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ plan })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to set plan: ${error.message}`);
  }
  logger.info("Updated user plan", { userId, plan });
}

export interface SubscriptionUpsert {
  userId: string;
  polarSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
}

/**
 * Upserts the user's subscription row keyed by the Polar subscription id.
 */
export async function upsertSubscription(
  input: SubscriptionUpsert,
): Promise<void> {
  const supabase: Supabase = createServerClient();
  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: input.userId,
        polar_subscription_id: input.polarSubscriptionId,
        status: input.status,
        current_period_end: input.currentPeriodEnd,
      },
      { onConflict: "polar_subscription_id" },
    );

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }
}
