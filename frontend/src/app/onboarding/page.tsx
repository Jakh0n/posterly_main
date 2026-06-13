import { redirect } from "next/navigation";

import { BrandForm } from "@/components/brand";
import { getBrand, getCurrentUser } from "@/services";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const brand = await getBrand();
  if (brand) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your brand
        </h1>
        <p className="text-sm text-muted-foreground">
          Import from your store or enter details manually. You can change this
          anytime.
        </p>
      </div>

      <BrandForm brand={null} redirectTo="/dashboard" submitLabel="Finish setup" />
    </main>
  );
}
