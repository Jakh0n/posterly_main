import Link from "next/link";
import { Plus } from "lucide-react";

import { CampaignsList } from "@/components/campaigns";
import { DashboardEmptyState, OnboardingPrompt } from "@/components/dashboard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBrand, listCampaigns } from "@/services";

export default async function DashboardPage() {
  const [brand, campaigns] = await Promise.all([getBrand(), listCampaigns()]);

  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {brand
              ? "Your campaigns and recent posters will appear here."
              : "Finish setting up your brand to start creating posters."}
          </p>
        </div>

        {brand ? (
          <Link href="/campaigns/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            New campaign
          </Link>
        ) : null}
      </div>

      {!brand ? (
        <OnboardingPrompt />
      ) : hasCampaigns ? (
        <CampaignsList campaigns={campaigns} />
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}
