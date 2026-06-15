import { NewCampaignForm } from "@/components/campaigns";
import { getBrand } from "@/services";

export default async function NewCampaignPage() {
  const brand = await getBrand();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New campaign</h1>
        <p className="text-sm text-muted-foreground">
          Upload a product photo and we&apos;ll generate 3 poster variants —
          studio, lifestyle and flat-lay.
        </p>
      </div>

      <NewCampaignForm brandId={brand?.id ?? null} />
    </div>
  );
}
