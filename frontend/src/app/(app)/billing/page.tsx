import { redirect } from "next/navigation";

import { BillingPacks, PlanCard, UsageMeter } from "@/components/billing";
import { getCreditBalance, getCurrentUser, getUsageStatus } from "@/services";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [balance, usage] = await Promise.all([
    getCreditBalance(user.id),
    getUsageStatus(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, credits and top-ups.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard plan={usage.plan} balance={balance} />
        <UsageMeter usage={usage} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Top up or upgrade
          </h2>
          <p className="text-sm text-muted-foreground">
            Buy a one-time credit pack or go Pro for monthly credits and no daily
            limit.
          </p>
        </div>
        <BillingPacks />
      </div>
    </div>
  );
}
