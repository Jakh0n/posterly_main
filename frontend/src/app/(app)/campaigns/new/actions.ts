"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { createServerClient } from "@/lib/supabase/server";
import { createCampaignSchema } from "@/lib/validations/campaign";
import { checkGenerationRateLimit } from "@/services/rateLimit";
import type { CreateCampaignInput } from "@/lib/validations/campaign";

export interface CreateCampaignResult {
  error: string;
}

const CAMPAIGN_COST = 1;

/**
 * Enqueues the async generation job on the backend worker. Returns true on a
 * 202 accept. Authenticated with a shared worker secret when configured.
 */
async function enqueueGenerationJob(campaignId: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.WORKER_SECRET) {
      headers["x-worker-secret"] = process.env.WORKER_SECRET;
    }

    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/jobs/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ campaignId }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Creates a campaign and kicks off generation. The credit ledger is debited
 * exactly once (atomically via `spend_credits`) and refunded if the job can't
 * be enqueued. Redirects to the campaign detail page on success.
 */
export async function createCampaign(
  input: CreateCampaignInput,
): Promise<CreateCampaignResult | void> {
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid campaign details";
    return { error: first };
  }

  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "You must be signed in" };
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

  const { data: campaign, error: insertError } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      brand_id: parsed.data.brandId ?? null,
      product_name: parsed.data.productName,
      price: parsed.data.price,
      promo: parsed.data.promo,
      product_image_url: parsed.data.productImageUrl,
      status: "queued",
    })
    .select("id")
    .single();

  if (insertError || !campaign) {
    return { error: insertError?.message ?? "Could not create campaign" };
  }

  const campaignId = campaign.id;

  // Atomic, never-negative debit tied to this campaign (exactly once).
  const { error: spendError } = await supabase.rpc("spend_credits", {
    p_user_id: user.id,
    p_amount: CAMPAIGN_COST,
    p_reason: "campaign",
    p_ref_id: campaignId,
  });

  if (spendError) {
    await supabase.from("campaigns").delete().eq("id", campaignId);
    const insufficient = /insufficient/i.test(spendError.message);
    return {
      error: insufficient
        ? "You're out of credits. Upgrade to keep creating."
        : "Could not reserve a credit for this campaign.",
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
    return {
      error: "Could not start generation. Your credit was refunded.",
    };
  }

  revalidatePath("/dashboard");
  redirect(`/campaigns/${campaignId}`);
}
