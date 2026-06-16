import { AlertTriangle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLAN_LABEL } from "@/lib/billing";
import { cn } from "@/lib/utils";
import type { UsageStatus } from "@/services";

export interface UsageMeterProps {
  usage: UsageStatus;
}

export function UsageMeter({ usage }: UsageMeterProps) {
  const pct = Math.min(
    100,
    Math.round((usage.dailyUsed / usage.dailyCap) * 100),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily usage</CardTitle>
        <CardDescription>
          {usage.dailyUsed} of {usage.dailyCap} campaigns used today on the{" "}
          {PLAN_LABEL[usage.plan]} plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usage.capReached ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {usage.capReached ? (
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {usage.plan === "free"
              ? "You've hit the free daily limit. Upgrade to keep creating."
              : "You've hit today's limit. Try again tomorrow or buy a credit pack."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {usage.remaining} campaign{usage.remaining === 1 ? "" : "s"} left
            today.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
