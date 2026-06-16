"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";
import { enqueueGenerationJob } from "@/services/campaignJobs";
import { checkGenerationRateLimit } from "@/services/rateLimit";

export interface CampaignActionResult {
  error?: string;
}

const CAMPAIGN_COST = 1;

async function requireOwnedCampaign(campaignId: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in" as const };
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !campaign) {
    return { error: "Campaign not found" as const };
  }

  return { supabase, user, campaign };
}

/**
 * Deletes a campaign and its creatives (cascade). Redirects to the dashboard.
 */
export async function deleteCampaign(
  campaignId: string,
): Promise<CampaignActionResult | void> {
  const ctx = await requireOwnedCampaign(campaignId);
  if ("error" in ctx) {
    return { error: ctx.error };
  }

  const { supabase } = ctx;
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/**
 * Retries a failed campaign: clears creatives, debits one credit, re-queues
 * generation on the same campaign row.
 */
export async function regenerateCampaign(
  campaignId: string,
): Promise<CampaignActionResult> {
  const ctx = await requireOwnedCampaign(campaignId);
  if ("error" in ctx) {
    return { error: ctx.error };
  }

  const { supabase, user, campaign } = ctx;

  if (campaign.status !== "failed") {
    return { error: "Only failed campaigns can be regenerated." };
  }

  try {
    const rateLimit = await checkGenerationRateLimit(user.id);
    if (!rateLimit.allowed) {
      return { error: rateLimit.reason ?? "Rate limit exceeded" };
    }
  } catch {
    return { error: "Could not verify your usage. Please try again." };
  }

  const { data: balance, error: balanceError } = await supabase.rpc(
    "get_credit_balance",
    { p_user_id: user.id },
  );
  if (balanceError) {
    return { error: "Could not verify your credit balance." };
  }
  if ((balance ?? 0) < CAMPAIGN_COST) {
    return { error: "You're out of credits. Upgrade to keep creating." };
  }

  const { error: deleteCreativesError } = await supabase
    .from("creatives")
    .delete()
    .eq("campaign_id", campaignId);
  if (deleteCreativesError) {
    return { error: "Could not clear previous variants." };
  }

  const { error: resetError } = await supabase
    .from("campaigns")
    .update({
      status: "queued",
      error: null,
      favorite_creative_id: null,
    })
    .eq("id", campaignId);
  if (resetError) {
    return { error: "Could not reset campaign." };
  }

  const { error: spendError } = await supabase.rpc("spend_credits", {
    p_user_id: user.id,
    p_amount: CAMPAIGN_COST,
    p_reason: "campaign",
    p_ref_id: campaignId,
  });
  if (spendError) {
    await supabase
      .from("campaigns")
      .update({ status: "failed", error: "Could not reserve a credit" })
      .eq("id", campaignId);
    const insufficient = /insufficient/i.test(spendError.message);
    return {
      error: insufficient
        ? "You're out of credits. Upgrade to keep creating."
        : "Could not reserve a credit for regeneration.",
    };
  }

  const enqueued = await enqueueGenerationJob(campaignId);
  if (!enqueued) {
    await supabase
      .from("campaigns")
      .update({ status: "failed", error: "Could not enqueue generation" })
      .eq("id", campaignId);
    await supabase.rpc("refund_credits", {
      p_user_id: user.id,
      p_ref_id: campaignId,
    });
    return { error: "Could not start generation. Your credit was refunded." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return {};
}

/**
 * Marks a variant as the campaign favorite, or clears the selection when the
 * same variant is clicked again.
 */
export async function setFavoriteCreative(
  campaignId: string,
  creativeId: string,
): Promise<CampaignActionResult & { favoriteCreativeId?: string | null }> {
  const ctx = await requireOwnedCampaign(campaignId);
  if ("error" in ctx) {
    return { error: ctx.error };
  }

  const { supabase, campaign } = ctx;

  const { data: creative, error: creativeError } = await supabase
    .from("creatives")
    .select("id")
    .eq("id", creativeId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (creativeError || !creative) {
    return { error: "Variant not found." };
  }

  const nextFavorite =
    campaign.favorite_creative_id === creativeId ? null : creativeId;

  const { error } = await supabase
    .from("campaigns")
    .update({ favorite_creative_id: nextFavorite })
    .eq("id", campaignId);

  if (error) {
    return { error: "Could not update favorite." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { favoriteCreativeId: nextFavorite };
}
