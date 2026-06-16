"use client";

import { useState, useTransition } from "react";
import { Download, ExternalLink, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { setFavoriteCreative } from "@/app/(app)/campaigns/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { downloadCampaignAsset } from "@/lib/download";
import { cn } from "@/lib/utils";
import type { Creative } from "@/types/campaign";

export interface VariantCardProps {
  campaignId: string;
  creative: Creative;
  isFavorite: boolean;
  onFavoriteChange: (creativeId: string | null) => void;
}

function variantLabel(creative: Creative): string {
  const template = creative.layout?.template;
  if (template) {
    return template.charAt(0).toUpperCase() + template.slice(1);
  }
  return `Variant ${creative.variant_index + 1}`;
}

function buildFilename(creative: Creative): string {
  const label = variantLabel(creative)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `posterly-${label || `variant-${creative.variant_index + 1}`}.png`;
}

export function VariantCard({
  campaignId,
  creative,
  isFavorite,
  onFavoriteChange,
}: VariantCardProps) {
  const [pendingFavorite, startFavorite] = useTransition();
  const [downloading, setDownloading] = useState(false);

  if (!creative.final_url) {
    return null;
  }

  const handleFavorite = () => {
    startFavorite(async () => {
      const result = await setFavoriteCreative(campaignId, creative.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onFavoriteChange(result.favoriteCreativeId ?? null);
    });
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      downloadCampaignAsset(creative.final_url as string, buildFilename(creative));
    } catch {
      toast.error("Could not start download.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card
      className={cn(
        "gap-0 py-0",
        isFavorite && "ring-2 ring-primary",
      )}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={creative.final_url}
          alt={`${variantLabel(creative)} poster`}
          className="aspect-square w-full object-cover"
        />
        <Button
          type="button"
          variant={isFavorite ? "default" : "secondary"}
          size="icon-sm"
          className="absolute top-2 right-2 shadow-sm"
          disabled={pendingFavorite}
          onClick={handleFavorite}
          aria-label={isFavorite ? "Remove favorite" : "Mark as favorite"}
          aria-pressed={isFavorite}
        >
          {pendingFavorite ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
          )}
        </Button>
      </div>
      <CardContent className="py-3">
        <p className="text-sm font-medium">{variantLabel(creative)}</p>
        {isFavorite ? (
          <p className="text-xs text-primary">Selected favorite</p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={downloading}
          onClick={handleDownload}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          render={
            <a
              href={creative.final_url}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </Button>
      </CardFooter>
    </Card>
  );
}
