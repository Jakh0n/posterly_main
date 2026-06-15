import { redirect } from "next/navigation";

import { FreeTierCapNotice, NewCampaignForm } from "@/components/campaigns";
import { getBrand, getCurrentUser, getUsageStatus } from "@/services";

export default async function NewCampaignPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [brand, usage] = await Promise.all([
    getBrand(),
    getUsageStatus(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New campaign</h1>
        <p className="text-sm text-muted-foreground">
          Upload a product photo and we&apos;ll generate 3 poster variants —
          studio, lifestyle and flat-lay.
        </p>
      </div>

      <FreeTierCapNotice usage={usage} />

      <NewCampaignForm brandId={brand?.id ?? null} />
    </div>
  );
}
