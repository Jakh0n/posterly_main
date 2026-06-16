import { redirect } from "next/navigation";

import { BillingPacks, PlanCard, UsageMeter } from "@/components/billing";
import { SIGNUP_BONUS_CREDITS } from "@/lib/billing";
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
          Manage your plan, credits and top-ups. 1 credit = 1 campaign with 3
          poster variants.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard plan={usage.plan} balance={balance} />
        <UsageMeter usage={usage} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">Subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Monthly credits plus a higher daily campaign limit than the free plan.
          </p>
        </div>
        <BillingPacks kind="subscription" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">Credit packs</h2>
          <p className="text-sm text-muted-foreground">
            One-time top-ups for seasonal promos and events. New accounts start
            with {SIGNUP_BONUS_CREDITS} free credits.
          </p>
        </div>
        <BillingPacks kind="one_time" />
      </div>
    </div>
  );
}
