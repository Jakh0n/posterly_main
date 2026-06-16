import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CampaignActions } from "./CampaignActions";

export interface CampaignFailedStateProps {
  campaignId: string;
  error: string | null;
  onRegenerated?: () => void;
}

export function CampaignFailedState({
  campaignId,
  error,
  onRegenerated,
}: CampaignFailedStateProps) {
  const isCreditsError = /credit/i.test(error ?? "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold">Generation failed</h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t finish this campaign. Your credit has been refunded.
          </p>
        </div>

        {error ? (
          <p className="max-w-md rounded-lg border border-destructive/20 bg-background/80 px-4 py-3 text-left text-sm text-foreground">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-3">
          <CampaignActions
            campaignId={campaignId}
            status="failed"
            onRegenerated={onRegenerated}
          />
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link
              href="/campaigns/new"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Start a new campaign
            </Link>
            {isCreditsError ? (
              <Link
                href="/billing"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Get more credits
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
