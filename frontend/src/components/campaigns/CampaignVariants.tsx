"use client";

import { VariantCard } from "./VariantCard";
import type { Creative } from "@/types/campaign";

export interface CampaignVariantsProps {
  campaignId: string;
  creatives: Creative[];
  favoriteCreativeId: string | null;
  onFavoriteChange: (creativeId: string | null) => void;
}

export function CampaignVariants({
  campaignId,
  creatives,
  favoriteCreativeId,
  onFavoriteChange,
}: CampaignVariantsProps) {
  const ready = creatives
    .filter((c) => c.final_url)
    .sort((a, b) => a.variant_index - b.variant_index);

  if (ready.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ready.map((creative) => (
        <VariantCard
          key={creative.id}
          campaignId={campaignId}
          creative={creative}
          isFavorite={favoriteCreativeId === creative.id}
          onFavoriteChange={onFavoriteChange}
        />
      ))}
    </div>
  );
}
