import { createServerClient } from "@/lib/supabase/server";
import type { Campaign, CampaignWithCreatives, Creative } from "@/types/campaign";

/**
 * Returns a single campaign owned by the current user (RLS-scoped), or null.
 * Server-only.
 */
export async function getCampaign(id: string): Promise<Campaign | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Campaign;
  } catch {
    return null;
  }
}

/**
 * Returns a campaign together with its creatives (ordered by variant), or null.
 * Server-only.
 */
export async function getCampaignWithCreatives(
  id: string,
): Promise<CampaignWithCreatives | null> {
  try {
    const supabase = await createServerClient();

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !campaign) {
      return null;
    }

    const { data: creatives } = await supabase
      .from("creatives")
      .select("*")
      .eq("campaign_id", id)
      .order("variant_index", { ascending: true });

    return {
      campaign: campaign as Campaign,
      creatives: (creatives ?? []) as Creative[],
    };
  } catch {
    return null;
  }
}

/**
 * Lists the current user's campaigns (most recent first). Server-only.
 */
export async function listCampaigns(limit = 24): Promise<Campaign[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data as Campaign[];
  } catch {
    return [];
  }
}
