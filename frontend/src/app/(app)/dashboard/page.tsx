import { DashboardEmptyState, OnboardingPrompt } from "@/components/dashboard";
import { getBrand } from "@/services";

export default async function DashboardPage() {
  const brand = await getBrand();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {brand
            ? "Your campaigns and recent posters will appear here."
            : "Finish setting up your brand to start creating posters."}
        </p>
      </div>

      {brand ? <DashboardEmptyState /> : <OnboardingPrompt />}
    </div>
  );
}
