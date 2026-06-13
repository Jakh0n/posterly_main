import { BrandForm } from "@/components/brand";
import { getBrand } from "@/services";

export default async function BrandPage() {
  const brand = await getBrand();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Brand</h1>
        <p className="text-sm text-muted-foreground">
          {brand
            ? "Update your brand details, colors and logo."
            : "Set up your brand to personalize your posters."}
        </p>
      </div>

      <BrandForm brand={brand} />
    </div>
  );
}
