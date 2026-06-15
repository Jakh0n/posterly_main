"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { startCheckout } from "@/app/(app)/billing/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BILLING_PACKS, type BillingPackId } from "@/lib/billing";
import { cn } from "@/lib/utils";

export function BillingPacks() {
  const [pendingId, setPendingId] = useState<BillingPackId | null>(null);
  const [, startTransition] = useTransition();

  const handleClick = (packId: BillingPackId) => {
    setPendingId(packId);
    startTransition(async () => {
      try {
        const result = await startCheckout(packId);
        if (result.url) {
          window.location.href = result.url;
          return;
        }
        toast.error(result.error ?? "Could not start checkout.");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {BILLING_PACKS.map((pack) => (
        <Card key={pack.id} className={cn(pack.highlighted && "ring-2 ring-primary")}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {pack.name}
              {pack.kind === "subscription" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Monthly
                </span>
              )}
            </CardTitle>
            <CardDescription>{pack.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tracking-tight">
              ${pack.priceUsd}
              {pack.kind === "subscription" && (
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              )}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary" />
              {pack.credits} credits
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button
              className="w-full"
              variant={pack.highlighted ? "default" : "outline"}
              disabled={pendingId !== null}
              onClick={() => handleClick(pack.id)}
            >
              {pendingId === pack.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pack.kind === "subscription" ? (
                "Upgrade"
              ) : (
                "Buy credits"
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
