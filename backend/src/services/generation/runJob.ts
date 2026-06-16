import { createServerClient } from "../../lib/supabase";
import { HttpError } from "../../lib/httpError";
import { logger } from "../../utils/logger";
import type { CampaignStatus } from "../../types/db";
import { generateProductImage, generateStyledBriefs, type StyledBrief } from "../ai";
import { renderOverlay } from "../overlay";
import { uploadObject } from "../storage";

type Supabase = ReturnType<typeof createServerClient>;

interface GeneratedVariant extends StyledBrief {
  creativeId: string;
  variantIndex: number;
  backgroundUrl: string;
  backgroundImage: Buffer;
}

async function setStatus(
  supabase: Supabase,
  campaignId: string,
  status: CampaignStatus,
): Promise<void> {
  const { error } = await supabase
    .from("campaigns")
    .update({ status, error: null })
    .eq("id", campaignId);

  if (error) {
    throw HttpError.internal(`Failed to set status ${status}: ${error.message}`);
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw HttpError.internal(`Failed to download image (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function failCampaign(
  supabase: Supabase,
  userId: string,
  campaignId: string,
  reason: string,
): Promise<void> {
  await supabase
    .from("campaigns")
    .update({ status: "failed", error: reason })
    .eq("id", campaignId);

  // Refund is idempotent and only applies to failed, owned campaigns.
  const { error: refundError } = await supabase.rpc("refund_credits", {
    p_user_id: userId,
    p_ref_id: campaignId,
  });

  if (refundError) {
    logger.error("Credit refund failed", { campaignId, error: refundError.message });
  }
}

/**
 * Runs the full async generation pipeline for a queued campaign:
 * writing -> generating -> composing -> done. On any failure the campaign is
 * marked 'failed', the reason recorded, and the spent credit refunded.
 */
export async function runGenerationJob(campaignId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: campaign, error: loadError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (loadError) {
    logger.error("Failed to load campaign", { campaignId, error: loadError.message });
    return;
  }
  if (!campaign) {
    logger.warn("Campaign not found for generation", { campaignId });
    return;
  }
  if (campaign.status !== "queued") {
    logger.warn("Skipping campaign not in queued state", {
      campaignId,
      status: campaign.status,
    });
    return;
  }
  if (!campaign.product_image_url) {
    await failCampaign(supabase, campaign.user_id, campaignId, "Missing product image");
    return;
  }

  const productImageUrl = campaign.product_image_url;
  const productName = campaign.product_name;
  const price = campaign.price ?? "";
  const promo = campaign.promo ?? "";

  try {
    const { data: brand } = await supabase
      .from("brands")
      .select("logo_url, palette")
      .eq("user_id", campaign.user_id)
      .limit(1)
      .maybeSingle();

    const logoUrl = brand?.logo_url ?? null;

    // ---- writing: 3 strict-JSON briefs varying the style axis ----
    await setStatus(supabase, campaignId, "writing");
    const briefs = await generateStyledBriefs({
      productName,
      price,
      promo,
      productImageUrl,
    });

    // ---- generating: OpenAI scene render per brief ----
    await setStatus(supabase, campaignId, "generating");
    const variants: GeneratedVariant[] = [];

    for (let index = 0; index < briefs.length; index += 1) {
      const { style, brief } = briefs[index];

      const sceneImageUrl = await generateProductImage({ productImageUrl, brief });
      const backgroundImage = await downloadImage(sceneImageUrl);
      const background = await uploadObject(
        backgroundImage,
        "image/png",
        `campaigns/${campaignId}`,
      );

      const { data: creative, error: insertError } = await supabase
        .from("creatives")
        .insert({
          campaign_id: campaignId,
          variant_index: index,
          background_url: background.url,
        })
        .select("id")
        .single();

      if (insertError || !creative) {
        throw HttpError.internal(
          `Failed to create creative: ${insertError?.message ?? "unknown"}`,
        );
      }

      variants.push({
        style,
        brief,
        creativeId: creative.id,
        variantIndex: index,
        backgroundUrl: background.url,
        backgroundImage,
      });
    }

    // ---- composing: overlay copy (+ logo), persist final + layout ----
    await setStatus(supabase, campaignId, "composing");

    for (const variant of variants) {
      const finalImage = await renderOverlay({
        baseImage: variant.backgroundImage,
        productName,
        price,
        promo,
        logoUrl,
      });

      const final = await uploadObject(
        finalImage,
        "image/png",
        `campaigns/${campaignId}`,
      );

      const layout = {
        template: variant.style,
        headline: productName,
        price,
        promo,
        logoUrl,
        palette: brand?.palette ?? null,
      };

      const { error: updateError } = await supabase
        .from("creatives")
        .update({ final_url: final.url, layout })
        .eq("id", variant.creativeId);

      if (updateError) {
        throw HttpError.internal(`Failed to finalize creative: ${updateError.message}`);
      }
    }

    await setStatus(supabase, campaignId, "done");
    logger.info("Campaign generation complete", { campaignId });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Generation failed";
    logger.error("Campaign generation failed", { campaignId, reason });
    await failCampaign(supabase, campaign.user_id, campaignId, reason);
  }
}
