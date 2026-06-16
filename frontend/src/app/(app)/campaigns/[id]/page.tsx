import { notFound, redirect } from "next/navigation";

import { CampaignActions, CampaignProgress } from "@/components/campaigns";
import { getCampaignWithCreatives, getCurrentUser, getUsageStatus } from "@/services";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const data = await getCampaignWithCreatives(id);

  if (!data) {
    notFound();
  }

  const { campaign, creatives } = data;
  const usage = await getUsageStatus(user.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {campaign.product_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {campaign.price ? `${campaign.price} · ` : ""}
            {campaign.promo}
          </p>
        </div>
        {campaign.status !== "failed" ? (
          <CampaignActions campaignId={campaign.id} status={campaign.status} />
        ) : null}
      </div>

      <CampaignProgress
        initialCampaign={campaign}
        initialCreatives={creatives}
        watermarkExports={usage.plan === "free"}
      />
    </div>
  );
}
